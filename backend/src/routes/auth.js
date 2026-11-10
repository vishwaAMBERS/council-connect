import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/index.js';
import { HttpError, h, str } from '../lib/http.js';
import { signToken, requireAuth, publicUser, findUserByEmail, findUserById } from '../lib/auth.js';
import { verificationScope } from '../services/council.js';

const router = express.Router();

/** The signed-in user as the clients see it, including whether they may verify council members. */
async function sessionUser(user) {
  const scope = await verificationScope(user);
  return { ...publicUser(user), canVerify: scope.admin || scope.gsCouncilIds.length > 0 };
}

router.post('/login', h(async (req, res) => {
  const email = str(req.body?.email);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const row = (await query('SELECT id, password_hash, is_active FROM users WHERE lower(email) = lower($1)', [email])).rows[0];
  const ok = row && row.is_active && (await bcrypt.compare(password, row.password_hash));
  if (!ok) throw new HttpError(401, 'Invalid email or password');

  const user = await findUserById(row.id);
  res.json({ token: signToken(user), user: await sessionUser(user) });
}));

// Students self-register. Representative and admin accounts need an invite code,
// which fixes the role (and, for representatives, the council seat).
router.post('/register', h(async (req, res) => {
  const body = req.body || {};
  const fullName = str(body.fullName);
  const email = str(body.email).toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const inviteCode = str(body.inviteCode);
  const unitCode = str(body.unitCode);
  const year = body.year === undefined || body.year === null || body.year === '' ? null : Number(body.year);

  if (fullName.length < 2 || fullName.length > 150) throw new HttpError(400, 'Full name is required');
  if (password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters');
  if (year !== null && (!Number.isInteger(year) || year < 1 || year > 4)) throw new HttpError(400, 'Year must be between 1 and 4');
  if (['representative', 'admin'].includes(body.role) && !inviteCode) {
    throw new HttpError(400, 'An invite code is required to register as a representative or admin');
  }

  const domain = email.split('@')[1] || '';
  const institution = (await query('SELECT id, email_domain FROM institutions WHERE email_domain = $1 AND is_active', [domain])).rows[0];
  if (!institution || !/^[^@\s]+@[^@\s]+$/.test(email)) throw new HttpError(400, 'Register with your college email address');
  if (await findUserByEmail(email)) throw new HttpError(409, 'An account with this email already exists');

  let invite = null;
  if (inviteCode) {
    // Claim the code first so it cannot be used twice, even by simultaneous requests.
    invite = (await query(
      `UPDATE invite_codes SET used_at = now()
       WHERE code = $1 AND used_at IS NULL AND (expires_at IS NULL OR expires_at > now())
       RETURNING *`,
      [inviteCode]
    )).rows[0];
    if (!invite) throw new HttpError(400, 'Invite code is invalid, expired or already used');
  }

  try {
    const role = invite ? invite.role : 'student';
    let unitId = null;
    if (invite?.council_id) {
      // A departmental seat fixes the unit; main-council members keep their own unit.
      unitId = (await query('SELECT academic_unit_id FROM councils WHERE id = $1', [invite.council_id])).rows[0]?.academic_unit_id || null;
    }
    if (!unitId && unitCode) {
      unitId = (await query('SELECT id FROM academic_units WHERE institution_id = $1 AND code = $2 AND is_active', [institution.id, unitCode])).rows[0]?.id || null;
      if (!unitId) throw new HttpError(400, 'Unknown branch');
    }
    if (!unitId && role !== 'admin') throw new HttpError(400, 'Branch is required');
    if (role === 'student' && year === null) throw new HttpError(400, 'Year of study is required');

    const created = (await query(
      `INSERT INTO users (institution_id, academic_unit_id, full_name, email, password_hash, role, year)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [institution.id, unitId, fullName, email, await bcrypt.hash(password, 10), role, role === 'admin' ? null : year]
    )).rows[0];

    if (invite) {
      await query('UPDATE invite_codes SET used_by = $2 WHERE code = $1', [invite.code, created.id]);
      if (invite.council_id) {
        // New seats start unverified and report to the council's General Secretary.
        const parentId = invite.position === 'general_secretary' ? null : (await query(
          `SELECT id FROM council_profiles
           WHERE council_id = $1 AND position = 'general_secretary' AND is_active LIMIT 1`,
          [invite.council_id]
        )).rows[0]?.id || null;
        await query(
          `INSERT INTO council_profiles (council_id, user_id, position, position_title, term_start, term_end, parent_profile_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [invite.council_id, created.id, invite.position, invite.position_title, invite.term_start, invite.term_end, parentId]
        );
      }
    }

    const user = await findUserById(created.id);
    res.status(201).json({ token: signToken(user), user: await sessionUser(user) });
  } catch (error) {
    if (invite) await query('UPDATE invite_codes SET used_at = NULL WHERE code = $1 AND used_by IS NULL', [invite.code]).catch(() => {});
    if (error?.code === '23505') throw new HttpError(409, 'An account with this email already exists');
    throw error;
  }
}));

router.get('/me', requireAuth, h(async (req, res) => {
  res.json({ user: await sessionUser(req.user) });
}));

export default router;

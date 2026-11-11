// Invite codes: how council members and admins get accounts (F-01).
//  - An admin (HOD level) can issue a code for any council seat, or for another admin.
//  - A verified General Secretary can issue codes for seats in their own council, except the GS seat.
// A code works once. The account it creates starts unverified and goes through the usual verification chain.
import crypto from 'node:crypto';
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid, str } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { POSITION_TITLES, positionsForCouncil } from '../lib/positions.js';
import { verificationScope } from '../services/council.js';
import { audit } from '../services/audit.js';

const router = express.Router();
router.use(requireAuth);

/** Councils the user may issue codes for. Throws 403 when there are none. */
async function issuableCouncils(user) {
  const scope = await verificationScope(user);
  if (!scope.admin && scope.gsCouncilIds.length === 0) {
    throw new HttpError(403, 'Only admins and verified General Secretaries can manage invite codes');
  }
  const rows = (await query(
    `SELECT c.id, c.name, c.type, au.code AS unit_code FROM councils c
     LEFT JOIN academic_units au ON au.id = c.academic_unit_id
     WHERE c.is_active AND ($1::boolean OR c.id = ANY($2::uuid[]))
     ORDER BY (c.type = 'main') DESC, c.name`,
    [scope.admin, scope.gsCouncilIds]
  )).rows;
  return { scope, councils: rows };
}

/** Positions the user may issue within a council. A GS cannot create another GS. */
const issuablePositions = (scope, council) =>
  positionsForCouncil(council.type).filter((position) => scope.admin || position !== 'general_secretary');

// The academic year runs July to June; a code issued in November 2026 is for 2026-07-01 .. 2027-06-30.
function currentTerm(now = new Date()) {
  const startYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${startYear}-07-01`, `${startYear + 1}-06-30`];
}

// Unambiguous characters only (no 0/O, 1/I/L), so a code can be read out or copied by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const randomPart = (length = 6) => Array.from(crypto.randomBytes(length), (byte) => ALPHABET[byte % ALPHABET.length]).join('');

// What the user can issue: used to build the form.
router.get('/invite-codes/options', h(async (req, res) => {
  const { scope, councils } = await issuableCouncils(req.user);
  res.json({
    canIssueAdmin: scope.admin,
    councils: councils.map((council) => ({
      id: council.id,
      name: council.name,
      positions: issuablePositions(scope, council).map((position) => ({ value: position, label: POSITION_TITLES[position] }))
    }))
  });
}));

const CODE_SELECT = `
  SELECT i.code, i.role, i.position, i.position_title, i.created_at, i.used_at, i.expires_at,
         to_char(i.term_start, 'YYYY-MM-DD') AS term_start, to_char(i.term_end, 'YYYY-MM-DD') AS term_end,
         c.name AS council_name, cb.full_name AS created_by_name, i.created_by, ub.full_name AS used_by_name
  FROM invite_codes i
  LEFT JOIN councils c ON c.id = i.council_id
  LEFT JOIN users cb ON cb.id = i.created_by
  LEFT JOIN users ub ON ub.id = i.used_by`;

const publicCode = (row) => ({
  code: row.code,
  role: row.role,
  positionTitle: row.position_title,
  councilName: row.council_name,
  termStart: row.term_start,
  termEnd: row.term_end,
  createdAt: row.created_at,
  createdByName: row.created_by_name,
  expiresAt: row.expires_at,
  usedAt: row.used_at,
  usedByName: row.used_by_name,
  status: row.used_at ? 'used' : row.expires_at && new Date(row.expires_at) < new Date() ? 'expired' : 'unused'
});

// Admins see every code; a General Secretary sees the codes for their own council.
router.get('/invite-codes', h(async (req, res) => {
  const { scope } = await issuableCouncils(req.user);
  const rows = (await query(
    `${CODE_SELECT} WHERE ($1::boolean OR i.council_id = ANY($2::uuid[]))
     ORDER BY (i.used_at IS NOT NULL), i.created_at DESC`,
    [scope.admin, scope.gsCouncilIds]
  )).rows;
  res.json({ codes: rows.map(publicCode) });
}));

router.post('/invite-codes', h(async (req, res) => {
  const { scope, councils } = await issuableCouncils(req.user);
  const body = req.body || {};
  const role = body.role === 'admin' ? 'admin' : 'representative';
  const expiresInDays = body.expiresInDays === undefined || body.expiresInDays === null || body.expiresInDays === '' ? 30 : Number(body.expiresInDays);
  if (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) throw new HttpError(400, 'Expiry must be between 1 and 365 days');

  let council = null;
  let position = null;
  let prefix = 'ADMIN';
  if (role === 'admin') {
    if (!scope.admin) throw new HttpError(403, 'Only an admin can invite another admin');
  } else {
    council = isUuid(body.councilId) ? councils.find((entry) => entry.id === body.councilId) : null;
    if (!council) throw new HttpError(403, 'You cannot issue codes for that council');
    position = str(body.position);
    if (!issuablePositions(scope, council).includes(position)) throw new HttpError(400, 'That position cannot be issued for this council');
    prefix = council.unit_code || 'MAIN';
  }

  const [termStart, termEnd] = currentTerm();
  let created;
  // The random part makes a clash very unlikely; retry rather than fail if one happens.
  for (let attempt = 0; attempt < 3 && !created; attempt += 1) {
    const code = `${prefix}-${randomPart()}`;
    try {
      created = (await query(
        `INSERT INTO invite_codes (code, role, council_id, position, position_title, term_start, term_end, created_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now() + make_interval(days => $9)) RETURNING code`,
        [code, role, council?.id || null, position, position ? POSITION_TITLES[position] : null,
          position ? termStart : null, position ? termEnd : null, req.user.id, expiresInDays]
      )).rows[0];
    } catch (error) {
      if (error?.code !== '23505') throw error;
    }
  }
  if (!created) throw new HttpError(500, 'Could not generate a code. Try again');

  await audit(req.user, 'invite.created', 'invite_code', null,
    role === 'admin' ? 'Issued an admin invite code' : `Issued an invite code for ${POSITION_TITLES[position]} (${council.name})`);
  const row = (await query(`${CODE_SELECT} WHERE i.code = $1`, [created.code])).rows[0];
  res.status(201).json({ code: publicCode(row) });
}));

// Revoke a code that has not been used. Used codes stay as a record of how the account was created.
router.delete('/invite-codes/:code', h(async (req, res) => {
  const { scope } = await issuableCouncils(req.user);
  const row = (await query(`SELECT code, council_id, used_at, position_title FROM invite_codes WHERE code = $1`, [req.params.code])).rows[0];
  const visible = row && (scope.admin || scope.gsCouncilIds.includes(row.council_id));
  if (!visible) throw new HttpError(404, 'Invite code not found');
  if (row.used_at) throw new HttpError(409, 'This code was already used and cannot be revoked');

  const deleted = (await query('DELETE FROM invite_codes WHERE code = $1 AND used_at IS NULL RETURNING code', [row.code])).rows[0];
  if (!deleted) throw new HttpError(409, 'This code was already used and cannot be revoked');
  await audit(req.user, 'invite.revoked', 'invite_code', null, `Revoked an unused invite code${row.position_title ? ` for ${row.position_title}` : ' for an admin'}`);
  res.json({ ok: true });
}));

export default router;

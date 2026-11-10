// Verification badge system (Phase 1 PRD, F-05). All hierarchy rules are enforced here, server-side.
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid } from '../lib/http.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { PROFILE_SELECT, publicProfile, verificationScope, verifyDenialReason } from '../services/council.js';

const router = express.Router();
router.use(requireAuth);

// One-time, irreversible verification of a council member.
router.post('/council-profiles/:id/verify', h(async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Council profile not found');
  const profile = (await query(`${PROFILE_SELECT} WHERE cp.id = $1`, [req.params.id])).rows[0];
  if (!profile) throw new HttpError(404, 'Council profile not found');

  const scope = await verificationScope(req.user);
  const denial = verifyDenialReason(scope, req.user, profile);
  if (denial) throw new HttpError(profile.is_verified ? 409 : 403, denial);

  const updated = (await query(
    `UPDATE council_profiles SET is_verified = TRUE, verified_by = $2, verified_at = now()
     WHERE id = $1 AND NOT is_verified RETURNING id`,
    [profile.profile_id, req.user.id]
  )).rows[0];
  if (!updated) throw new HttpError(409, 'This member is already verified');

  await query(
    `INSERT INTO verification_logs (council_profile_id, verified_user_id, verified_by, position_title, council_name)
     VALUES ($1, $2, $3, $4, $5)`,
    [profile.profile_id, profile.user_id, req.user.id, profile.position_title, profile.council_name]
  );

  const fresh = (await query(`${PROFILE_SELECT} WHERE cp.id = $1`, [profile.profile_id])).rows[0];
  res.json({ profile: publicProfile(fresh) });
}));

// Unverified members the current user is allowed to verify.
router.get('/verification/pending', h(async (req, res) => {
  const scope = await verificationScope(req.user);
  if (!scope.admin && scope.gsCouncilIds.length === 0) return res.json({ members: [], canVerify: false });

  const rows = (await query(
    `${PROFILE_SELECT} WHERE cp.is_active AND NOT cp.is_verified AND u.is_active
     ORDER BY (c.type = 'main') DESC, au.code, cp.position, u.full_name`
  )).rows;
  const members = rows.filter((row) => verifyDenialReason(scope, req.user, row) === null).map(publicProfile);
  return res.json({ members, canVerify: true });
}));

// Audit log: who verified whom, when, for what position. HOD-level admins only.
router.get('/verification/logs', requireRole('admin'), h(async (req, res) => {
  const rows = (await query(
    `SELECT l.id, l.position_title, l.council_name, l.verified_at,
            m.id AS member_id, m.full_name AS member_name, b.id AS by_id, b.full_name AS by_name
     FROM verification_logs l
     JOIN users m ON m.id = l.verified_user_id
     JOIN users b ON b.id = l.verified_by
     ORDER BY l.verified_at DESC`
  )).rows;
  res.json({
    logs: rows.map((row) => ({
      id: row.id,
      positionTitle: row.position_title,
      councilName: row.council_name,
      verifiedAt: row.verified_at,
      member: { id: row.member_id, fullName: row.member_name },
      verifiedBy: { id: row.by_id, fullName: row.by_name }
    }))
  });
}));

export default router;

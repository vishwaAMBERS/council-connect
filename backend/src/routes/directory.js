import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid, str } from '../lib/http.js';
import { requireAuth, publicUser, findUserById } from '../lib/auth.js';
import { POSITION_GROUPS } from '../lib/positions.js';
import { PROFILE_SELECT, publicProfile, verificationScope, verifyDenialReason } from '../services/council.js';
import { optionalUploadUrl } from './uploads.js';

const router = express.Router();
const DECLINE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Public: branches and position filters for the register form and directory filters.
router.get('/meta', h(async (req, res) => {
  const units = (await query('SELECT code, name, type FROM academic_units WHERE is_active ORDER BY name')).rows;
  res.json({ units, positionGroups: POSITION_GROUPS.map(({ key, label }) => ({ key, label })) });
}));

// Council directory: all active council members, searchable and filterable.
router.get('/directory', requireAuth, h(async (req, res) => {
  const search = str(req.query.search);
  const unit = str(req.query.unit);
  const group = POSITION_GROUPS.find((entry) => entry.key === str(req.query.position));
  if (str(req.query.position) && !group) throw new HttpError(400, 'Unknown position filter');

  const rows = (await query(
    `${PROFILE_SELECT}
     WHERE cp.is_active AND u.is_active
       AND ($1 = '' OR u.full_name ILIKE '%' || $1 || '%' OR cp.position_title ILIKE '%' || $1 || '%')
       AND ($2 = '' OR au.code = $2 OR ($2 = 'MAIN' AND c.type = 'main'))
       AND ($3::text[] IS NULL OR cp.position::text = ANY($3::text[]))
     ORDER BY (c.type = 'main') DESC, au.code, cp.position, u.full_name`,
    [search, unit, group ? group.positions : null]
  )).rows;

  res.json({ members: rows.map(publicProfile) });
}));

// Role-aware profile page for any user, with what the viewer may do on it.
router.get('/users/:id', requireAuth, h(async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'User not found');
  const target = await findUserById(req.params.id);
  if (!target || !target.is_active) throw new HttpError(404, 'User not found');

  const profileRows = (await query(
    `${PROFILE_SELECT} WHERE cp.user_id = $1 AND cp.is_active ORDER BY cp.created_at`,
    [target.id]
  )).rows;

  const viewer = req.user;
  const isSelf = viewer.id === target.id;
  const user = publicUser(target);
  if (!isSelf && viewer.role !== 'admin') delete user.email; // contact goes through requests, not email

  const scope = profileRows.some((row) => !row.is_verified) ? await verificationScope(viewer) : null;
  const councilProfiles = profileRows.map((row) => ({
    ...publicProfile(row),
    canVerify: scope ? verifyDenialReason(scope, viewer, row) === null : false
  }));

  // Contact-request state between a student viewer and this representative.
  let contact = null;
  if (viewer.role === 'student' && !isSelf && councilProfiles.length > 0) {
    const latest = (await query(
      `SELECT id, status, created_at, resolved_at FROM contact_requests
       WHERE from_user_id = $1 AND to_user_id = $2 ORDER BY created_at DESC LIMIT 1`,
      [viewer.id, target.id]
    )).rows[0];
    const retryAt = latest?.status === 'declined' ? new Date(new Date(latest.resolved_at).getTime() + DECLINE_COOLDOWN_MS) : null;
    const coolingDown = retryAt && retryAt > new Date();
    contact = {
      request: latest ? { id: latest.id, status: latest.status, createdAt: latest.created_at, resolvedAt: latest.resolved_at } : null,
      canRequest: !latest || (latest.status === 'declined' && !coolingDown),
      canRequestAt: coolingDown ? retryAt : null
    };
  }

  res.json({ user, councilProfiles, isSelf, contact });
}));

// Owner-only profile edit: about (max 200 characters) and/or profile photo.
router.patch('/users/me', requireAuth, h(async (req, res) => {
  const body = req.body || {};
  const hasAbout = typeof body.about === 'string';
  const hasAvatar = Object.hasOwn(body, 'avatarUrl');
  if (!hasAbout && !hasAvatar) throw new HttpError(400, 'Nothing to update');

  if (hasAbout) {
    const about = body.about.trim();
    if (about.length > 200) throw new HttpError(400, 'About must be 200 characters or fewer');
    await query('UPDATE users SET about = $2, updated_at = now() WHERE id = $1', [req.user.id, about || null]);
  }
  if (hasAvatar) {
    // null or '' removes the photo.
    await query('UPDATE users SET avatar_url = $2, updated_at = now() WHERE id = $1', [req.user.id, optionalUploadUrl(body.avatarUrl, 'Photo')]);
  }
  res.json({ user: publicUser(await findUserById(req.user.id)) });
}));

export { DECLINE_COOLDOWN_MS };
export default router;

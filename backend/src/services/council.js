// Council profile queries and the verification hierarchy (Phase 1 PRD, F-05).
import { query } from '../db/index.js';
import { positionGroupOf } from '../lib/positions.js';

export const PROFILE_SELECT = `
  SELECT cp.id AS profile_id, cp.user_id, cp.council_id, cp.position, cp.position_title,
         to_char(cp.term_start, 'YYYY-MM-DD') AS term_start,
         to_char(cp.term_end, 'YYYY-MM-DD') AS term_end,
         cp.is_verified, cp.verified_at, cp.is_active,
         u.full_name, u.avatar_url, u.about,
         c.name AS council_name, c.type AS council_type,
         au.code AS unit_code, au.name AS unit_name,
         vb.full_name AS verified_by_name
  FROM council_profiles cp
  JOIN users u ON u.id = cp.user_id
  JOIN councils c ON c.id = cp.council_id
  LEFT JOIN academic_units au ON au.id = c.academic_unit_id
  LEFT JOIN users vb ON vb.id = cp.verified_by`;

export function publicProfile(row) {
  return {
    profileId: row.profile_id,
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    about: row.about,
    position: row.position,
    positionGroup: positionGroupOf(row.position),
    positionTitle: row.position_title,
    council: { id: row.council_id, name: row.council_name, type: row.council_type },
    unit: row.unit_code ? { code: row.unit_code, name: row.unit_name } : null,
    termStart: row.term_start,
    termEnd: row.term_end,
    isVerified: row.is_verified,
    verifiedAt: row.verified_at,
    verifiedByName: row.verified_by_name
  };
}

/**
 * Who the actor may verify:
 *  - an admin (HOD level) verifies General Secretaries and main-council members;
 *  - a verified General Secretary verifies the other members of their own council.
 * Returns { admin, gsCouncilIds }.
 */
export async function verificationScope(actor) {
  if (actor.role === 'admin') return { admin: true, gsCouncilIds: [] };
  const rows = (await query(
    `SELECT council_id FROM council_profiles
     WHERE user_id = $1 AND position = 'general_secretary' AND is_active AND is_verified`,
    [actor.id]
  )).rows;
  return { admin: false, gsCouncilIds: rows.map((row) => row.council_id) };
}

/** Returns null when allowed, otherwise the reason the actor cannot verify this profile. */
export function verifyDenialReason(scope, actor, profile) {
  if (!profile.is_active) return 'This council profile is no longer active';
  if (profile.is_verified) return 'This member is already verified';
  if (profile.user_id === actor.id) return 'You cannot verify yourself';

  const targetIsTopLevel = profile.position === 'general_secretary' || profile.council_type === 'main';
  if (scope.admin) {
    return targetIsTopLevel ? null : "Branch representatives are verified by their branch's General Secretary";
  }
  if (scope.gsCouncilIds.length === 0) return 'Only an admin or a verified General Secretary can verify members';
  if (targetIsTopLevel) return 'Only an HOD-level admin can verify General Secretaries and main-council members';
  if (!scope.gsCouncilIds.includes(profile.council_id)) return 'You can only verify representatives of your own branch';
  return null;
}

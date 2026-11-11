// Oversight for administrators: live analytics, audit log, and the academic-year archive.
// The archive browser itself (GET /archive) is open to every signed-in user.
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, str } from '../lib/http.js';
import { requireAuth, requireRole } from '../lib/auth.js';
import { audit } from '../services/audit.js';

const router = express.Router();
router.use(requireAuth);

const rows = async (text, params) => (await query(text, params)).rows;
const one = async (text, params) => (await query(text, params)).rows[0];
// Durations are reported in hours, to two decimals so that short ones are not rounded to zero.
const round1 = (value) => (value === null || value === undefined ? null : Math.round(Number(value) * 100) / 100);

/* ---------- Analytics ---------- */

router.get('/analytics', requireRole('admin'), h(async (req, res) => {
  // Governance
  const members = await one(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE cp.is_verified)::int AS verified
     FROM council_profiles cp JOIN users u ON u.id = cp.user_id WHERE cp.is_active AND u.is_active`
  );
  const membersByCouncil = await rows(
    `SELECT COALESCE(au.code, 'MAIN') AS code, c.name,
            count(*)::int AS total, count(*) FILTER (WHERE cp.is_verified)::int AS verified
     FROM council_profiles cp
     JOIN users u ON u.id = cp.user_id
     JOIN councils c ON c.id = cp.council_id
     LEFT JOIN academic_units au ON au.id = c.academic_unit_id
     WHERE cp.is_active AND u.is_active
     GROUP BY au.code, c.name, c.type ORDER BY (c.type = 'main') DESC, au.code`
  );
  const requests = await one(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status = 'pending')::int AS pending,
            count(*) FILTER (WHERE status = 'approved')::int AS approved,
            count(*) FILTER (WHERE status = 'declined')::int AS declined,
            avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL) AS avg_response_hours
     FROM contact_requests`
  );
  const requestsByCategory = await rows(
    `SELECT COALESCE(category::text, 'uncategorised') AS category, count(*)::int AS count
     FROM contact_requests GROUP BY category ORDER BY count DESC`
  );
  const requestsByRep = await rows(
    `SELECT u.id, u.full_name,
            count(*)::int AS total,
            count(*) FILTER (WHERE r.status = 'pending')::int AS pending,
            avg(EXTRACT(EPOCH FROM (r.resolved_at - r.created_at)) / 3600) FILTER (WHERE r.resolved_at IS NOT NULL) AS avg_response_hours
     FROM contact_requests r JOIN users u ON u.id = r.to_user_id
     GROUP BY u.id, u.full_name ORDER BY total DESC, u.full_name LIMIT 8`
  );

  // Events
  const events = await one(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE starts_at >= now())::int AS upcoming FROM events`
  );
  const registrations = await one(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE e.starts_at < now())::int AS past_total,
            count(*) FILTER (WHERE e.starts_at < now() AND r.attended)::int AS past_attended,
            count(DISTINCT r.student_id)::int AS distinct_students
     FROM event_registrations r JOIN events e ON e.id = r.event_id`
  );
  const students = await one(`SELECT count(*)::int AS total FROM users WHERE role = 'student' AND is_active`);
  const eventsByUnit = await rows(
    `SELECT COALESCE(au.code, 'No branch') AS code, count(*)::int AS count
     FROM events e LEFT JOIN academic_units au ON au.id = e.academic_unit_id
     GROUP BY au.code ORDER BY count DESC, code`
  );
  const topEvents = await rows(
    `SELECT e.id, e.title, e.starts_at, e.capacity,
            count(r.id)::int AS registrations, count(r.id) FILTER (WHERE r.attended)::int AS attended
     FROM events e LEFT JOIN event_registrations r ON r.event_id = e.id
     GROUP BY e.id ORDER BY registrations DESC, e.starts_at DESC LIMIT 6`
  );

  // Grievances
  const grievances = await one(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status <> 'resolved')::int AS open,
            count(*) FILTER (WHERE status = 'resolved')::int AS resolved,
            count(*) FILTER (WHERE escalated_at IS NOT NULL)::int AS escalated,
            count(*) FILTER (WHERE escalated_at IS NOT NULL AND status <> 'resolved')::int AS escalated_open,
            avg(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL) AS avg_resolution_hours
     FROM grievances`
  );
  const grievancesByCategory = await rows(
    `SELECT COALESCE(category::text, 'uncategorised') AS category, count(*)::int AS count,
            count(*) FILTER (WHERE status <> 'resolved')::int AS open
     FROM grievances GROUP BY category ORDER BY count DESC`
  );
  const grievancesByPriority = await rows(
    `SELECT g.priority::text AS priority, count(*)::int AS count FROM grievances g
     WHERE g.priority IS NOT NULL GROUP BY g.priority ORDER BY g.priority DESC`
  );

  // Lost and found
  const lostFound = await one(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE status = 'open')::int AS open,
            count(*) FILTER (WHERE status = 'matched')::int AS matched,
            count(*) FILTER (WHERE status = 'resolved')::int AS resolved
     FROM lost_found_items`
  );

  // Engagement: people who did something on the platform in the last 7 days.
  const active = await one(
    `SELECT count(DISTINCT user_id)::int AS users FROM (
       SELECT from_user_id AS user_id FROM contact_requests WHERE created_at > now() - interval '7 days'
       UNION ALL SELECT sender_id FROM messages WHERE sent_at > now() - interval '7 days'
       UNION ALL SELECT student_id FROM event_registrations WHERE registered_at > now() - interval '7 days'
       UNION ALL SELECT raised_by FROM grievances WHERE created_at > now() - interval '7 days'
       UNION ALL SELECT posted_by FROM lost_found_items WHERE created_at > now() - interval '7 days'
     ) activity`
  );

  res.json({
    generatedAt: new Date().toISOString(),
    governance: {
      activeMembers: members.total,
      verifiedMembers: members.verified,
      unverifiedMembers: members.total - members.verified,
      byCouncil: membersByCouncil,
      requests: {
        total: requests.total, pending: requests.pending, approved: requests.approved, declined: requests.declined,
        avgResponseHours: round1(requests.avg_response_hours)
      },
      requestsByCategory,
      requestsByRepresentative: requestsByRep.map((r) => ({
        id: r.id, fullName: r.full_name, total: r.total, pending: r.pending, avgResponseHours: round1(r.avg_response_hours)
      }))
    },
    events: {
      total: events.total,
      upcoming: events.upcoming,
      registrations: registrations.total,
      // Attendance is only meaningful for events that have already happened.
      attendanceRate: registrations.past_total ? Math.round((registrations.past_attended / registrations.past_total) * 100) : null,
      engagementRate: students.total ? Math.round((registrations.distinct_students / students.total) * 100) : null,
      byUnit: eventsByUnit,
      top: topEvents.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, capacity: e.capacity, registrations: e.registrations, attended: e.attended }))
    },
    grievances: {
      total: grievances.total, open: grievances.open, resolved: grievances.resolved,
      escalated: grievances.escalated, escalatedOpen: grievances.escalated_open,
      avgResolutionHours: round1(grievances.avg_resolution_hours),
      byCategory: grievancesByCategory,
      byPriority: grievancesByPriority
    },
    lostFound,
    engagement: { students: students.total, activeLast7Days: active.users }
  });
}));

/* ---------- Audit log ---------- */

router.get('/audit-logs', requireRole('admin'), h(async (req, res) => {
  const entity = str(req.query.entity); // e.g. "grievance", "member"
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
  const logs = await rows(
    `SELECT id, actor_name, action, entity_type, entity_id, summary, created_at FROM audit_logs
     WHERE ($1 = '' OR action LIKE $1 || '.%')
     ORDER BY created_at DESC, id LIMIT $2`,
    [entity, limit]
  );
  const entities = (await rows(`SELECT DISTINCT split_part(action, '.', 1) AS entity FROM audit_logs ORDER BY entity`)).map((r) => r.entity);
  res.json({
    entities,
    logs: logs.map((l) => ({
      id: l.id, actorName: l.actor_name, action: l.action, entityType: l.entity_type, entityId: l.entity_id, summary: l.summary, createdAt: l.created_at
    }))
  });
}));

/* ---------- Archive ---------- */

const ARCHIVE_SELECT = `
  SELECT id, user_id, full_name, position, position_title, council_name, council_type, unit_code, unit_name,
         to_char(term_start, 'YYYY-MM-DD') AS term_start, to_char(term_end, 'YYYY-MM-DD') AS term_end,
         academic_year, was_verified, verified_by_name, verified_at,
         events_count, requests_handled, grievances_resolved, archived_at
  FROM council_archive`;

const publicRecord = (r) => ({
  id: r.id,
  userId: r.user_id,
  fullName: r.full_name,
  position: r.position,
  positionTitle: r.position_title,
  councilName: r.council_name,
  councilType: r.council_type,
  unit: r.unit_code ? { code: r.unit_code, name: r.unit_name } : null,
  termStart: r.term_start,
  termEnd: r.term_end,
  academicYear: r.academic_year,
  wasVerified: r.was_verified,
  verifiedByName: r.verified_by_name,
  verifiedAt: r.verified_at,
  eventsCount: r.events_count,
  requestsHandled: r.requests_handled,
  grievancesResolved: r.grievances_resolved,
  archivedAt: r.archived_at
});

// Past council members, by academic year and branch. `unit=MAIN` selects the main council.
router.get('/archive', h(async (req, res) => {
  const years = (await rows('SELECT DISTINCT academic_year FROM council_archive ORDER BY academic_year DESC')).map((r) => r.academic_year);
  const year = str(req.query.year) || years[0] || '';
  const unit = str(req.query.unit);
  const records = await rows(
    `${ARCHIVE_SELECT}
     WHERE academic_year = $1 AND ($2 = '' OR unit_code = $2 OR ($2 = 'MAIN' AND council_type = 'main'))
     ORDER BY (council_type = 'main') DESC, unit_code, position, full_name`,
    [year, unit]
  );
  res.json({ years, year, records: records.map(publicRecord) });
}));

// What starting a new year would archive, for the confirmation screen.
router.get('/archive/preview', requireRole('admin'), h(async (req, res) => {
  const active = await one('SELECT count(*)::int AS n FROM council_profiles WHERE is_active');
  const years = (await rows('SELECT DISTINCT academic_year FROM council_archive ORDER BY academic_year DESC')).map((r) => r.academic_year);
  res.json({ activeProfiles: active.n, archivedYears: years });
}));

// End of the academic year: snapshot every active council seat into the archive, deactivate the
// seats, and return their holders to ordinary student accounts. The directory is then empty and
// ready for the incoming council. Archived records are never modified.
router.post('/archive/run', requireRole('admin'), h(async (req, res) => {
  const academicYear = str(req.body?.academicYear);
  if (!/^\d{4}-\d{2}$/.test(academicYear) || Number(academicYear.slice(5)) !== (Number(academicYear.slice(0, 4)) + 1) % 100) {
    throw new HttpError(400, 'Academic year must look like 2026-27');
  }

  // One statement, so the snapshot and the deactivation succeed or fail together.
  const result = await one(
    `WITH snap AS (
       INSERT INTO council_archive (
         institution_id, council_profile_id, user_id, full_name, position, position_title, council_name, council_type,
         unit_code, unit_name, term_start, term_end, academic_year, was_verified, verified_by_name, verified_at,
         events_count, requests_handled, grievances_resolved, archived_by)
       SELECT c.institution_id, cp.id, u.id, u.full_name, cp.position, cp.position_title, c.name, c.type,
              au.code, au.name, cp.term_start, cp.term_end, $1::varchar, cp.is_verified, vb.full_name, cp.verified_at,
              (SELECT count(*) FROM events e
                 WHERE e.created_by = u.id AND (cp.term_start IS NULL OR e.created_at >= cp.term_start)),
              (SELECT count(*) FROM contact_requests r
                 WHERE r.to_user_id = u.id AND r.status <> 'pending' AND (cp.term_start IS NULL OR r.created_at >= cp.term_start)),
              (SELECT count(*) FROM grievances g
                 WHERE g.assigned_to = u.id AND g.status = 'resolved' AND (cp.term_start IS NULL OR g.created_at >= cp.term_start)),
              $2::uuid
       FROM council_profiles cp
       JOIN users u ON u.id = cp.user_id
       JOIN councils c ON c.id = cp.council_id
       LEFT JOIN academic_units au ON au.id = c.academic_unit_id
       LEFT JOIN users vb ON vb.id = cp.verified_by
       WHERE cp.is_active
       RETURNING council_profile_id, user_id
     ),
     closed AS (
       UPDATE council_profiles SET is_active = FALSE
       WHERE id IN (SELECT council_profile_id FROM snap) RETURNING id
     ),
     demoted AS (
       UPDATE users SET role = 'student', updated_at = now()
       WHERE role = 'representative' AND id IN (SELECT user_id FROM snap) RETURNING id
     )
     SELECT (SELECT count(*)::int FROM snap) AS archived, (SELECT count(*)::int FROM closed) AS closed`,
    [academicYear, req.user.id]
  );
  if (result.archived === 0) throw new HttpError(409, 'There are no active council members to archive');

  await audit(req.user, 'archive.run', 'archive', null, `Closed academic year ${academicYear}: archived ${result.archived} council seats`);
  res.status(201).json({ academicYear, archived: result.archived });
}));

export default router;

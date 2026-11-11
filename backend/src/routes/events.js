// Event management: verified representatives publish, students register, organisers track attendance.
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid, str } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { hasVerifiedSeat } from '../services/council.js';
import { optionalUploadUrl } from './uploads.js';
import { audit } from '../services/audit.js';
import { notify } from '../services/notify.js';

const router = express.Router();
router.use(requireAuth);

// $1 = viewer id. Visibility is applied separately with VISIBLE.
const EVENT_SELECT = `
  SELECT e.id, e.title, e.description, e.venue, e.starts_at, e.branch_scope, e.capacity, e.poster_url, e.created_at,
         e.created_by, o.full_name AS organizer_name,
         (SELECT cp.position_title FROM council_profiles cp
          WHERE cp.user_id = o.id AND cp.is_active ORDER BY cp.created_at LIMIT 1) AS organizer_position,
         au.code AS unit_code, au.name AS unit_name,
         l.id AS location_id, l.name AS location_name, l.lat, l.lng,
         (SELECT count(*)::int FROM event_registrations r WHERE r.event_id = e.id) AS registration_count,
         EXISTS (SELECT 1 FROM event_registrations r WHERE r.event_id = e.id AND r.student_id = $1) AS is_registered
  FROM events e
  JOIN users o ON o.id = e.created_by
  LEFT JOIN academic_units au ON au.id = e.academic_unit_id
  LEFT JOIN campus_locations l ON l.id = e.location_id`;

// $1 = viewer id, $2 = viewer unit id (may be NULL), $3 = viewer is admin.
const VISIBLE = `(e.branch_scope = 'all_branches' OR e.academic_unit_id = $2 OR e.created_by = $1 OR $3::boolean)`;

const viewerParams = (user) => [user.id, user.academic_unit_id, user.role === 'admin'];

const publicEvent = (row, viewer) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  venue: row.venue,
  location: row.location_id ? { id: row.location_id, name: row.location_name, lat: row.lat, lng: row.lng } : null,
  startsAt: row.starts_at,
  isPast: new Date(row.starts_at) < new Date(),
  branchScope: row.branch_scope,
  unit: row.unit_code ? { code: row.unit_code, name: row.unit_name } : null,
  capacity: row.capacity,
  posterUrl: row.poster_url,
  organizer: { id: row.created_by, fullName: row.organizer_name, positionTitle: row.organizer_position },
  registrationCount: row.registration_count,
  isFull: row.capacity !== null && row.registration_count >= row.capacity,
  isRegistered: row.is_registered,
  canManage: row.created_by === viewer.id || viewer.role === 'admin'
});

async function loadVisibleEvent(req) {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Event not found');
  const row = (await query(`${EVENT_SELECT} WHERE e.id = $4 AND ${VISIBLE}`, [...viewerParams(req.user), req.params.id])).rows[0];
  if (!row) throw new HttpError(404, 'Event not found');
  return row;
}

// Upcoming events first (soonest on top); ?when=past lists finished ones, newest first.
router.get('/', h(async (req, res) => {
  const past = req.query.when === 'past';
  const rows = (await query(
    `${EVENT_SELECT} WHERE ${VISIBLE} AND e.starts_at ${past ? '<' : '>='} now()
     ORDER BY e.starts_at ${past ? 'DESC' : 'ASC'}`,
    viewerParams(req.user)
  )).rows;
  res.json({ events: rows.map((row) => publicEvent(row, req.user)), canCreate: await canCreateEvents(req.user) });
}));

export async function canCreateEvents(user) {
  return user.role === 'admin' || (user.role === 'representative' && (await hasVerifiedSeat(user.id)));
}

router.post('/', h(async (req, res) => {
  if (!(await canCreateEvents(req.user))) throw new HttpError(403, 'Only verified representatives can create events');

  const body = req.body || {};
  const title = str(body.title);
  const description = str(body.description);
  let venue = str(body.venue);
  const branchScope = body.branchScope === 'own_branch' ? 'own_branch' : 'all_branches';
  const startsAt = new Date(body.startsAt);
  const capacity = body.capacity === undefined || body.capacity === null || body.capacity === '' ? null : Number(body.capacity);
  const posterUrl = optionalUploadUrl(body.posterUrl, 'Poster');

  if (!title || title.length > 120) throw new HttpError(400, 'Title is required (max 120 characters)');
  if (!description || description.length > 2000) throw new HttpError(400, 'Description is required (max 2000 characters)');
  if (Number.isNaN(startsAt.getTime())) throw new HttpError(400, 'Date and time are required');
  if (startsAt <= new Date()) throw new HttpError(400, 'The event must start in the future');
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) throw new HttpError(400, 'Capacity must be a positive whole number');
  if (branchScope === 'own_branch' && !req.user.academic_unit_id) throw new HttpError(400, 'Your account has no branch, so the event must be open to all branches');

  let locationId = null;
  if (body.locationId) {
    const location = isUuid(body.locationId)
      ? (await query('SELECT id, name FROM campus_locations WHERE id = $1 AND is_active', [body.locationId])).rows[0]
      : null;
    if (!location) throw new HttpError(400, 'Unknown campus location');
    locationId = location.id;
    venue ||= location.name;
  }
  if (!venue || venue.length > 120) throw new HttpError(400, 'Venue is required (max 120 characters)');

  const created = (await query(
    `INSERT INTO events (created_by, academic_unit_id, title, description, venue, location_id, starts_at, branch_scope, capacity, poster_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [req.user.id, req.user.academic_unit_id, title, description, venue, locationId, startsAt.toISOString(), branchScope, capacity, posterUrl]
  )).rows[0];

  await audit(req.user, 'event.created', 'event', created.id, `Published the event "${title}"`);

  const row = (await query(`${EVENT_SELECT} WHERE e.id = $2`, [req.user.id, created.id])).rows[0];
  res.status(201).json({ event: publicEvent(row, req.user) });
}));

// Event detail. Organiser and admins also get the participant list.
router.get('/:id', h(async (req, res) => {
  const row = await loadVisibleEvent(req);
  const event = publicEvent(row, req.user);
  let participants = null;
  if (event.canManage) {
    participants = (await query(
      `SELECT u.id, u.full_name, u.year, au.code AS unit_code, r.registered_at, r.attended
       FROM event_registrations r
       JOIN users u ON u.id = r.student_id
       LEFT JOIN academic_units au ON au.id = u.academic_unit_id
       WHERE r.event_id = $1 ORDER BY r.registered_at`,
      [row.id]
    )).rows.map((p) => ({
      id: p.id, fullName: p.full_name, year: p.year, unitCode: p.unit_code, registeredAt: p.registered_at, attended: p.attended
    }));
  }
  res.json({ event, participants });
}));

router.post('/:id/register', h(async (req, res) => {
  if (req.user.role !== 'student') throw new HttpError(403, 'Only students register for events');
  const row = await loadVisibleEvent(req);
  if (new Date(row.starts_at) < new Date()) throw new HttpError(409, 'This event has already started');
  if (row.is_registered) throw new HttpError(409, 'You are already registered for this event');

  // Capacity is checked inside the insert so two simultaneous sign-ups cannot both take the last seat.
  let inserted;
  try {
    inserted = (await query(
      `INSERT INTO event_registrations (event_id, student_id)
       SELECT e.id, $2 FROM events e
       WHERE e.id = $1 AND (e.capacity IS NULL OR (SELECT count(*) FROM event_registrations r WHERE r.event_id = e.id) < e.capacity)
       RETURNING id`,
      [row.id, req.user.id]
    )).rows[0];
  } catch (error) {
    if (error?.code === '23505') throw new HttpError(409, 'You are already registered for this event');
    throw error;
  }
  if (!inserted) throw new HttpError(409, 'This event is full');

  res.status(201).json({ event: publicEvent(await loadVisibleEvent(req), req.user) });
}));

router.delete('/:id/register', h(async (req, res) => {
  const row = await loadVisibleEvent(req);
  if (new Date(row.starts_at) < new Date()) throw new HttpError(409, 'This event has already started');
  await query('DELETE FROM event_registrations WHERE event_id = $1 AND student_id = $2', [row.id, req.user.id]);
  res.json({ event: publicEvent(await loadVisibleEvent(req), req.user) });
}));

// Organiser or admin marks who attended.
router.patch('/:id/attendance', h(async (req, res) => {
  const row = await loadVisibleEvent(req);
  if (row.created_by !== req.user.id && req.user.role !== 'admin') throw new HttpError(403, 'Only the organiser can mark attendance');
  if (!isUuid(req.body?.studentId) || typeof req.body?.attended !== 'boolean') throw new HttpError(400, 'studentId and attended are required');

  const updated = (await query(
    'UPDATE event_registrations SET attended = $3 WHERE event_id = $1 AND student_id = $2 RETURNING id',
    [row.id, req.body.studentId, req.body.attended]
  )).rows[0];
  if (!updated) throw new HttpError(404, 'That student is not registered for this event');
  res.json({ ok: true });
}));

/**
 * Reminds registered students about events starting within the next 24 hours. Each event is
 * claimed first (reminder_sent_at), so a reminder goes out once even if two sweeps overlap.
 */
export async function sendEventReminders() {
  const due = (await query(
    `UPDATE events SET reminder_sent_at = now()
     WHERE reminder_sent_at IS NULL AND starts_at > now() AND starts_at <= now() + interval '24 hours'
     RETURNING id, title, venue, starts_at`
  )).rows;
  let sent = 0;
  for (const event of due) {
    const students = (await query('SELECT student_id FROM event_registrations WHERE event_id = $1', [event.id])).rows;
    const time = new Date(event.starts_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
    for (const { student_id: studentId } of students) {
      await notify(studentId, { type: 'event', title: `Reminder: ${event.title}`, body: `${time} at ${event.venue}`, link: '/events' });
      sent += 1;
    }
  }
  return sent;
}

export default router;

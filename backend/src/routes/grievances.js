// Hostel grievance management: submit, AI triage, status tracking, escalation.
//
// Who handles what:
//  - verified representatives and admins work the queue (take -> in progress -> resolved);
//  - a grievance not resolved before its deadline is escalated automatically, and the
//    student can escalate it by hand at any time; escalated grievances are handled by admins only.
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid, str } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { hasVerifiedSeat } from '../services/council.js';
import { classifyGrievanceInBackground, ESCALATION_HOURS } from '../services/categoriser.js';
import { notify, notifyAdmins } from '../services/notify.js';
import { optionalUploadUrl } from './uploads.js';
import { audit } from '../services/audit.js';

const router = express.Router();
router.use(requireAuth);

const GRIEVANCE_SELECT = `
  SELECT g.id, g.title, g.description, g.room_number, g.image_url, g.category, g.priority, g.status,
         g.escalation_due_at, g.escalated_at, g.resolution_note, g.created_at, g.resolved_at,
         g.raised_by, r.full_name AS raised_by_name, ru.code AS raised_by_unit, r.year AS raised_by_year,
         g.assigned_to, a.full_name AS assigned_to_name
  FROM grievances g
  JOIN users r ON r.id = g.raised_by
  LEFT JOIN academic_units ru ON ru.id = r.academic_unit_id
  LEFT JOIN users a ON a.id = g.assigned_to`;

const publicGrievance = (row) => ({
  id: row.id,
  title: row.title,
  description: row.description,
  roomNumber: row.room_number,
  imageUrl: row.image_url,
  category: row.category,
  priority: row.priority,
  status: row.status,
  escalationDueAt: row.status === 'resolved' || row.escalated_at ? null : row.escalation_due_at,
  escalatedAt: row.escalated_at,
  resolutionNote: row.resolution_note,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
  raisedBy: { id: row.raised_by, fullName: row.raised_by_name, unitCode: row.raised_by_unit, year: row.raised_by_year },
  assignedTo: row.assigned_to ? { id: row.assigned_to, fullName: row.assigned_to_name } : null
});

/** 'admin', 'rep' (verified representative) or null (cannot handle grievances). */
async function handlerLevel(user) {
  if (user.role === 'admin') return 'admin';
  if (user.role === 'representative' && (await hasVerifiedSeat(user.id))) return 'rep';
  return null;
}

const addHistory = (grievanceId, actorId, status, note = null) =>
  query('INSERT INTO grievance_history (grievance_id, actor_id, status, note) VALUES ($1, $2, $3, $4)', [grievanceId, actorId, status, note]);

/**
 * Escalates every unresolved grievance that is past its deadline.
 * Runs on a timer (see server.js) and before grievances are read, so status is never stale.
 */
export async function escalateOverdue() {
  const rows = (await query(
    `UPDATE grievances SET status = 'escalated', escalated_at = now()
     WHERE status <> 'resolved' AND escalated_at IS NULL AND escalation_due_at < now()
     RETURNING id, raised_by, title`
  )).rows;
  for (const row of rows) {
    await addHistory(row.id, null, 'escalated', 'Not resolved within the response window. Escalated automatically to the HOD.');
    await audit(null, 'grievance.escalated', 'grievance', row.id, `Complaint "${row.title}": escalated automatically (deadline passed)`);
    await notify(row.raised_by, {
      type: 'grievance', title: 'Your complaint was escalated', body: row.title, link: `/grievances/${row.id}`
    });
    await notifyAdmins({ type: 'grievance', title: 'Complaint escalated to you', body: row.title, link: `/grievances/${row.id}` });
  }
  return rows.length;
}

async function loadGrievance(req) {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Complaint not found');
  const row = (await query(`${GRIEVANCE_SELECT} WHERE g.id = $1`, [req.params.id])).rows[0];
  const level = await handlerLevel(req.user);
  if (!row || (row.raised_by !== req.user.id && !level)) throw new HttpError(404, 'Complaint not found');
  return { row, level };
}

/** What the viewer may do with this grievance right now. */
function allowedActions(row, user, level) {
  const open = row.status !== 'resolved';
  const mayHandle = level === 'admin' || (level === 'rep' && !row.escalated_at);
  const mine = row.assigned_to === user.id;
  return {
    take: open && mayHandle && !mine,
    start: open && mayHandle && mine && row.status !== 'in_progress',
    resolve: open && mayHandle && mine,
    escalate: open && !row.escalated_at && row.raised_by === user.id
  };
}

router.post('/', h(async (req, res) => {
  if (req.user.role !== 'student') throw new HttpError(403, 'Only students can submit complaints');
  const title = str(req.body?.title);
  const description = str(req.body?.description);
  const roomNumber = str(req.body?.roomNumber);
  const imageUrl = optionalUploadUrl(req.body?.imageUrl, 'Photo');
  if (!title || title.length > 120) throw new HttpError(400, 'Title is required (max 120 characters)');
  if (!description || description.length > 1000) throw new HttpError(400, 'Description is required (max 1000 characters)');
  if (roomNumber.length > 40) throw new HttpError(400, 'Room / location must be 40 characters or fewer');

  const created = (await query(
    `INSERT INTO grievances (raised_by, title, description, room_number, image_url, escalation_due_at)
     VALUES ($1, $2, $3, $4, $5, now() + make_interval(hours => $6)) RETURNING id`,
    [req.user.id, title, description, roomNumber || null, imageUrl, ESCALATION_HOURS.medium]
  )).rows[0];
  await addHistory(created.id, req.user.id, 'submitted');
  await audit(req.user, 'grievance.submitted', 'grievance', created.id, `Complaint "${title}": submitted`);

  // Saved first; category, priority and the matching deadline are attached afterwards.
  classifyGrievanceInBackground(created.id, title, description);

  const row = (await query(`${GRIEVANCE_SELECT} WHERE g.id = $1`, [created.id])).rows[0];
  res.status(201).json({ grievance: publicGrievance(row) });
}));

// Students see their own complaints; handlers see the whole queue (most pressing first).
router.get('/', h(async (req, res) => {
  await escalateOverdue();
  const level = await handlerLevel(req.user);
  const rows = (await query(
    `${GRIEVANCE_SELECT}
     WHERE ($2::boolean OR g.raised_by = $1)
     ORDER BY (g.status = 'resolved'), (g.escalated_at IS NOT NULL) DESC, g.priority DESC NULLS LAST, g.created_at DESC`,
    [req.user.id, Boolean(level)]
  )).rows;
  res.json({ grievances: rows.map(publicGrievance), isHandler: Boolean(level), handlerLevel: level });
}));

router.get('/:id', h(async (req, res) => {
  await escalateOverdue();
  const { row, level } = await loadGrievance(req);
  const history = (await query(
    `SELECT hi.id, hi.status, hi.note, hi.created_at, u.full_name AS actor_name
     FROM grievance_history hi LEFT JOIN users u ON u.id = hi.actor_id
     WHERE hi.grievance_id = $1 ORDER BY hi.created_at, hi.id`,
    [row.id]
  )).rows;
  res.json({
    grievance: publicGrievance(row),
    history: history.map((entry) => ({
      id: entry.id, status: entry.status, note: entry.note, createdAt: entry.created_at, actorName: entry.actor_name || 'System'
    })),
    actions: allowedActions(row, req.user, level)
  });
}));

// Handler actions: take (assign to me), start (in progress), resolve (with a note).
router.post('/:id/:action(take|start|resolve)', h(async (req, res) => {
  await escalateOverdue();
  const { row, level } = await loadGrievance(req);
  const { action } = req.params;
  const actions = allowedActions(row, req.user, level);
  if (!actions[action]) {
    if (row.status === 'resolved') throw new HttpError(409, 'This complaint is already resolved');
    if (row.escalated_at && level === 'rep') throw new HttpError(403, 'This complaint was escalated and is now handled by the HOD');
    if (!level) throw new HttpError(403, 'Only verified representatives and admins can handle complaints');
    throw new HttpError(409, action === 'take' ? 'You are already handling this complaint' : 'Take this complaint before updating it');
  }
  const note = str(req.body?.note);
  if (note.length > 1000) throw new HttpError(400, 'Note must be 1000 characters or fewer');

  let status;
  if (action === 'take') {
    // An escalated complaint keeps its escalated status while an admin picks it up.
    status = row.escalated_at ? 'escalated' : 'assigned';
    await query('UPDATE grievances SET assigned_to = $2, status = $3 WHERE id = $1', [row.id, req.user.id, status]);
  } else if (action === 'start') {
    status = 'in_progress';
    await query(`UPDATE grievances SET status = 'in_progress' WHERE id = $1`, [row.id]);
  } else {
    if (!note) throw new HttpError(400, 'Add a resolution note so the student knows what was done');
    status = 'resolved';
    await query(`UPDATE grievances SET status = 'resolved', resolved_at = now(), resolution_note = $2 WHERE id = $1`, [row.id, note]);
  }
  await addHistory(row.id, req.user.id, status, note || (action === 'take' ? `Assigned to ${req.user.full_name}` : null));

  await audit(req.user, `grievance.${status}`, 'grievance', row.id, `Complaint "${row.title}": ${action === 'take' ? 'taken' : status.replace('_', ' ')}`);

  const titles = { take: 'Your complaint was assigned', start: 'Work started on your complaint', resolve: 'Your complaint was resolved' };
  await notify(row.raised_by, { type: 'grievance', title: titles[action], body: row.title, link: `/grievances/${row.id}` });

  res.json({ grievance: publicGrievance((await query(`${GRIEVANCE_SELECT} WHERE g.id = $1`, [row.id])).rows[0]) });
}));

// The student escalates by hand, with a reason.
router.post('/:id/escalate', h(async (req, res) => {
  await escalateOverdue();
  const { row, level } = await loadGrievance(req);
  if (!allowedActions(row, req.user, level).escalate) {
    if (row.raised_by !== req.user.id) throw new HttpError(403, 'Only the student who raised this complaint can escalate it');
    throw new HttpError(409, row.status === 'resolved' ? 'This complaint is already resolved' : 'This complaint is already escalated');
  }
  const reason = str(req.body?.reason);
  if (!reason || reason.length > 1000) throw new HttpError(400, 'Give a reason for escalating (max 1000 characters)');

  const updated = (await query(
    `UPDATE grievances SET status = 'escalated', escalated_at = now(), assigned_to = NULL
     WHERE id = $1 AND escalated_at IS NULL AND status <> 'resolved' RETURNING id`,
    [row.id]
  )).rows[0];
  if (!updated) throw new HttpError(409, 'This complaint is already escalated');
  await addHistory(row.id, req.user.id, 'escalated', `Escalated by the student: ${reason}`);
  await audit(req.user, 'grievance.escalated', 'grievance', row.id, `Complaint "${row.title}": escalated by the student`);
  await notifyAdmins({ type: 'grievance', title: 'Complaint escalated to you', body: row.title, link: `/grievances/${row.id}` });

  res.json({ grievance: publicGrievance((await query(`${GRIEVANCE_SELECT} WHERE g.id = $1`, [row.id])).rows[0]) });
}));

export default router;

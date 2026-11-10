// Contact request workflow and the direct-message thread it unlocks (Phase 1 PRD, F-04).
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid, str } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { categoriseInBackground } from '../services/categoriser.js';
import { DECLINE_COOLDOWN_MS } from './directory.js';

const router = express.Router();
router.use(requireAuth);

const REQUEST_SELECT = `
  SELECT r.id, r.reason_title, r.description, r.category, r.status, r.created_at, r.resolved_at,
         f.id AS from_id, f.full_name AS from_name, f.year AS from_year, fu.code AS from_unit,
         t.id AS to_id, t.full_name AS to_name,
         (SELECT cp.position_title FROM council_profiles cp
          WHERE cp.user_id = t.id AND cp.is_active ORDER BY cp.created_at LIMIT 1) AS to_position,
         (SELECT count(*)::int FROM messages m WHERE m.request_id = r.id) AS message_count,
         (SELECT max(m.sent_at) FROM messages m WHERE m.request_id = r.id) AS last_message_at
  FROM contact_requests r
  JOIN users f ON f.id = r.from_user_id
  LEFT JOIN academic_units fu ON fu.id = f.academic_unit_id
  JOIN users t ON t.id = r.to_user_id`;

const publicRequest = (row) => ({
  id: row.id,
  reasonTitle: row.reason_title,
  description: row.description,
  category: row.category,
  status: row.status,
  createdAt: row.created_at,
  resolvedAt: row.resolved_at,
  from: { id: row.from_id, fullName: row.from_name, year: row.from_year, unitCode: row.from_unit },
  to: { id: row.to_id, fullName: row.to_name, positionTitle: row.to_position },
  messageCount: row.message_count,
  lastMessageAt: row.last_message_at
});

/** Loads a request the current user is part of, or throws 404. */
async function loadOwnRequest(req) {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Request not found');
  const row = (await query(`${REQUEST_SELECT} WHERE r.id = $1`, [req.params.id])).rows[0];
  if (!row || (row.from_id !== req.user.id && row.to_id !== req.user.id)) throw new HttpError(404, 'Request not found');
  return row;
}

// Student submits a request to a representative.
router.post('/', h(async (req, res) => {
  if (req.user.role !== 'student') throw new HttpError(403, 'Only students can send contact requests');

  const toUserId = req.body?.toUserId;
  const reasonTitle = str(req.body?.reasonTitle);
  const description = str(req.body?.description);
  if (!isUuid(toUserId)) throw new HttpError(400, 'Choose a representative to contact');
  if (!reasonTitle || reasonTitle.length > 80) throw new HttpError(400, 'Reason title is required (max 80 characters)');
  if (!description || description.length > 400) throw new HttpError(400, 'Description is required (max 400 characters)');

  const isRep = (await query(
    `SELECT 1 FROM council_profiles cp JOIN users u ON u.id = cp.user_id
     WHERE cp.user_id = $1 AND cp.is_active AND u.is_active LIMIT 1`,
    [toUserId]
  )).rows.length > 0;
  if (!isRep) throw new HttpError(400, 'Contact requests can only be sent to council representatives');

  const latest = (await query(
    `SELECT status, resolved_at FROM contact_requests
     WHERE from_user_id = $1 AND to_user_id = $2 ORDER BY created_at DESC LIMIT 1`,
    [req.user.id, toUserId]
  )).rows[0];
  if (latest?.status === 'pending') throw new HttpError(409, 'You already have a pending request with this representative');
  if (latest?.status === 'approved') throw new HttpError(409, 'Your request was already approved. Use the message thread');
  if (latest?.status === 'declined') {
    const retryAt = new Date(new Date(latest.resolved_at).getTime() + DECLINE_COOLDOWN_MS);
    if (retryAt > new Date()) {
      throw new HttpError(409, 'Your last request was declined. You can send a new one after 24 hours', { canRequestAt: retryAt });
    }
  }

  let created;
  try {
    created = (await query(
      `INSERT INTO contact_requests (from_user_id, to_user_id, reason_title, description)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [req.user.id, toUserId, reasonTitle, description]
    )).rows[0];
  } catch (error) {
    if (error?.code === '23505') throw new HttpError(409, 'You already have an active request with this representative');
    throw error;
  }

  // Saved first; the AI category is attached afterwards and never blocks the student.
  categoriseInBackground(created.id, reasonTitle, description);

  const row = (await query(`${REQUEST_SELECT} WHERE r.id = $1`, [created.id])).rows[0];
  res.status(201).json({ request: publicRequest(row) });
}));

// Requests addressed to me: pending first, urgent first, then newest.
router.get('/inbox', h(async (req, res) => {
  const rows = (await query(
    `${REQUEST_SELECT} WHERE r.to_user_id = $1
     ORDER BY (r.status = 'pending') DESC, (r.category = 'urgent') DESC NULLS LAST, r.created_at DESC`,
    [req.user.id]
  )).rows;
  res.json({ requests: rows.map(publicRequest) });
}));

// Requests I sent.
router.get('/mine', h(async (req, res) => {
  const rows = (await query(`${REQUEST_SELECT} WHERE r.from_user_id = $1 ORDER BY r.created_at DESC`, [req.user.id])).rows;
  res.json({ requests: rows.map(publicRequest) });
}));

router.get('/:id', h(async (req, res) => {
  res.json({ request: publicRequest(await loadOwnRequest(req)) });
}));

// Representative approves or declines a pending request addressed to them.
for (const [action, status] of [['approve', 'approved'], ['decline', 'declined']]) {
  router.post(`/:id/${action}`, h(async (req, res) => {
    const row = await loadOwnRequest(req);
    if (row.to_id !== req.user.id) throw new HttpError(403, 'Only the representative can respond to this request');

    const updated = (await query(
      `UPDATE contact_requests SET status = $2, resolved_at = now()
       WHERE id = $1 AND to_user_id = $3 AND status = 'pending' RETURNING id`,
      [row.id, status, req.user.id]
    )).rows[0];
    if (!updated) throw new HttpError(409, `This request was already ${row.status}`);

    res.json({ request: publicRequest((await query(`${REQUEST_SELECT} WHERE r.id = $1`, [row.id])).rows[0]) });
  }));
}

// The message thread exists only for approved requests, and only for its two participants.
router.get('/:id/messages', h(async (req, res) => {
  const row = await loadOwnRequest(req);
  if (row.status !== 'approved') throw new HttpError(403, 'Messaging opens once the request is approved');
  const messages = (await query(
    'SELECT id, sender_id, content, sent_at FROM messages WHERE request_id = $1 ORDER BY sent_at, id',
    [row.id]
  )).rows;
  res.json({
    request: publicRequest(row),
    messages: messages.map((m) => ({ id: m.id, senderId: m.sender_id, content: m.content, sentAt: m.sent_at }))
  });
}));

router.post('/:id/messages', h(async (req, res) => {
  const row = await loadOwnRequest(req);
  if (row.status !== 'approved') throw new HttpError(403, 'Messaging opens once the request is approved');
  const content = str(req.body?.content);
  if (!content || content.length > 1000) throw new HttpError(400, 'Message is required (max 1000 characters)');

  const m = (await query(
    'INSERT INTO messages (request_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, sender_id, content, sent_at',
    [row.id, req.user.id, content]
  )).rows[0];
  res.status(201).json({ message: { id: m.id, senderId: m.sender_id, content: m.content, sentAt: m.sent_at } });
}));

export default router;

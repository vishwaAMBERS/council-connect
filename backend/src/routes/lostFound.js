// Lost and found: post reports, automatic matching, and in-platform contact between matched parties.
import express from 'express';
import { query } from '../db/index.js';
import { HttpError, h, isUuid, str } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';
import { similarity, MATCH_THRESHOLD } from '../services/matching.js';
import { notify } from '../services/notify.js';
import { optionalUploadUrl } from './uploads.js';

const router = express.Router();
router.use(requireAuth);

const ITEM_SELECT = `
  SELECT i.id, i.type, i.title, i.description, i.location, i.location_id, i.image_url, i.status, i.created_at,
         to_char(i.occurred_on, 'YYYY-MM-DD') AS occurred_on,
         i.posted_by, u.full_name AS posted_by_name
  FROM lost_found_items i JOIN users u ON u.id = i.posted_by`;

const publicItem = (row, viewerId) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  description: row.description,
  location: row.location,
  locationId: row.location_id,
  occurredOn: row.occurred_on,
  imageUrl: row.image_url,
  status: row.status,
  createdAt: row.created_at,
  postedByName: row.posted_by_name,
  isMine: row.posted_by === viewerId
});

// Everything not yet resolved, newest first. ?type=lost|found narrows it.
router.get('/', h(async (req, res) => {
  const type = ['lost', 'found'].includes(req.query.type) ? req.query.type : null;
  const rows = (await query(
    `${ITEM_SELECT} WHERE (i.status <> 'resolved' OR i.posted_by = $1) AND ($2::text IS NULL OR i.type::text = $2)
     ORDER BY (i.status = 'resolved'), i.created_at DESC`,
    [req.user.id, type]
  )).rows;
  res.json({ items: rows.map((row) => publicItem(row, req.user.id)) });
}));

router.post('/', h(async (req, res) => {
  const body = req.body || {};
  const type = body.type;
  const title = str(body.title);
  const description = str(body.description);
  let location = str(body.location);
  const occurredOn = str(body.occurredOn) || null;
  const imageUrl = optionalUploadUrl(body.imageUrl, 'Image');

  if (!['lost', 'found'].includes(type)) throw new HttpError(400, 'Say whether the item was lost or found');
  if (!title || title.length > 100) throw new HttpError(400, 'Item title is required (max 100 characters)');
  if (!description || description.length > 500) throw new HttpError(400, 'Description is required (max 500 characters)');
  if (occurredOn && (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || Number.isNaN(Date.parse(occurredOn)))) throw new HttpError(400, 'Date is not valid');
  if (occurredOn && new Date(occurredOn) > new Date()) throw new HttpError(400, 'Date cannot be in the future');

  let locationId = null;
  if (body.locationId) {
    const place = isUuid(body.locationId)
      ? (await query('SELECT id, name FROM campus_locations WHERE id = $1 AND is_active', [body.locationId])).rows[0]
      : null;
    if (!place) throw new HttpError(400, 'Unknown campus location');
    locationId = place.id;
    location ||= place.name;
  }
  if (!location || location.length > 120) throw new HttpError(400, 'Location is required (max 120 characters)');

  const created = (await query(
    `INSERT INTO lost_found_items (posted_by, type, title, description, location, location_id, occurred_on, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, title, description, location, location_id`,
    [req.user.id, type, title, description, location, locationId, occurredOn, imageUrl]
  )).rows[0];

  // Compare with open reports of the opposite type posted by other people.
  const candidates = (await query(
    `SELECT id, posted_by, title, description, location, location_id FROM lost_found_items
     WHERE type::text = $1 AND status <> 'resolved' AND posted_by <> $2`,
    [type === 'lost' ? 'found' : 'lost', req.user.id]
  )).rows;
  const matches = candidates
    .map((candidate) => ({ candidate, score: similarity(created, candidate) }))
    .filter((entry) => entry.score >= MATCH_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  for (const { candidate, score } of matches) {
    const [lostId, foundId] = type === 'lost' ? [created.id, candidate.id] : [candidate.id, created.id];
    const match = (await query(
      `INSERT INTO lost_found_matches (lost_item_id, found_item_id, score) VALUES ($1, $2, $3)
       ON CONFLICT (lost_item_id, found_item_id) DO NOTHING RETURNING id`,
      [lostId, foundId, score]
    )).rows[0];
    if (!match) continue;
    await query(`UPDATE lost_found_items SET status = 'matched' WHERE id IN ($1, $2) AND status = 'open'`, [lostId, foundId]);
    const link = `/lost-found?match=${match.id}`;
    await notify(candidate.posted_by, { type: 'lost_found', title: 'Possible match for your item', body: `"${candidate.title}" may match "${created.title}"`, link });
    await notify(req.user.id, { type: 'lost_found', title: 'Possible match for your item', body: `"${created.title}" may match "${candidate.title}"`, link });
  }

  const row = (await query(`${ITEM_SELECT} WHERE i.id = $1`, [created.id])).rows[0];
  res.status(201).json({ item: publicItem(row, req.user.id), matchCount: matches.length });
}));

const MATCH_SELECT = `
  SELECT m.id, m.score, m.created_at,
         l.id AS lost_id, l.title AS lost_title, l.description AS lost_description, l.location AS lost_location,
         l.image_url AS lost_image, l.status AS lost_status, l.posted_by AS lost_by, lu.full_name AS lost_by_name,
         f.id AS found_id, f.title AS found_title, f.description AS found_description, f.location AS found_location,
         f.image_url AS found_image, f.status AS found_status, f.posted_by AS found_by, fu.full_name AS found_by_name,
         (SELECT count(*)::int FROM match_messages mm WHERE mm.match_id = m.id) AS message_count
  FROM lost_found_matches m
  JOIN lost_found_items l ON l.id = m.lost_item_id JOIN users lu ON lu.id = l.posted_by
  JOIN lost_found_items f ON f.id = m.found_item_id JOIN users fu ON fu.id = f.posted_by`;

const publicMatch = (row, viewerId) => ({
  id: row.id,
  score: row.score,
  createdAt: row.created_at,
  lost: { id: row.lost_id, title: row.lost_title, description: row.lost_description, location: row.lost_location, imageUrl: row.lost_image, status: row.lost_status, postedByName: row.lost_by_name, isMine: row.lost_by === viewerId },
  found: { id: row.found_id, title: row.found_title, description: row.found_description, location: row.found_location, imageUrl: row.found_image, status: row.found_status, postedByName: row.found_by_name, isMine: row.found_by === viewerId },
  otherPartyName: row.lost_by === viewerId ? row.found_by_name : row.lost_by_name,
  messageCount: row.message_count
});

// Matches that involve one of my reports.
router.get('/matches', h(async (req, res) => {
  const rows = (await query(`${MATCH_SELECT} WHERE l.posted_by = $1 OR f.posted_by = $1 ORDER BY m.created_at DESC`, [req.user.id])).rows;
  res.json({ matches: rows.map((row) => publicMatch(row, req.user.id)) });
}));

async function loadOwnMatch(req) {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Match not found');
  const row = (await query(`${MATCH_SELECT} WHERE m.id = $1`, [req.params.id])).rows[0];
  if (!row || (row.lost_by !== req.user.id && row.found_by !== req.user.id)) throw new HttpError(404, 'Match not found');
  return row;
}

// The two matched parties talk here; neither sees the other's contact details.
router.get('/matches/:id/messages', h(async (req, res) => {
  const row = await loadOwnMatch(req);
  const messages = (await query('SELECT id, sender_id, content, sent_at FROM match_messages WHERE match_id = $1 ORDER BY sent_at, id', [row.id])).rows;
  res.json({
    match: publicMatch(row, req.user.id),
    messages: messages.map((m) => ({ id: m.id, senderId: m.sender_id, content: m.content, sentAt: m.sent_at }))
  });
}));

router.post('/matches/:id/messages', h(async (req, res) => {
  const row = await loadOwnMatch(req);
  const content = str(req.body?.content);
  if (!content || content.length > 1000) throw new HttpError(400, 'Message is required (max 1000 characters)');
  const m = (await query(
    'INSERT INTO match_messages (match_id, sender_id, content) VALUES ($1, $2, $3) RETURNING id, sender_id, content, sent_at',
    [row.id, req.user.id, content]
  )).rows[0];
  const otherId = row.lost_by === req.user.id ? row.found_by : row.lost_by;
  await notify(otherId, { type: 'lost_found', title: `New message about "${row.lost_title}"`, body: content, link: `/lost-found?match=${row.id}` });
  res.status(201).json({ message: { id: m.id, senderId: m.sender_id, content: m.content, sentAt: m.sent_at } });
}));

// The owner closes their report once the item is back with its owner.
router.post('/:id/resolve', h(async (req, res) => {
  if (!isUuid(req.params.id)) throw new HttpError(404, 'Item not found');
  const updated = (await query(
    `UPDATE lost_found_items SET status = 'resolved' WHERE id = $1 AND posted_by = $2 RETURNING id`,
    [req.params.id, req.user.id]
  )).rows[0];
  if (!updated) throw new HttpError(404, 'Item not found');
  const row = (await query(`${ITEM_SELECT} WHERE i.id = $1`, [updated.id])).rows[0];
  res.json({ item: publicItem(row, req.user.id) });
}));

export default router;

// Campus map data and in-app notifications.
import express from 'express';
import { query } from '../db/index.js';
import { h } from '../lib/http.js';
import { requireAuth } from '../lib/auth.js';

const router = express.Router();
router.use(requireAuth);

// Campus locations (for the map and for "pick a place" dropdowns).
router.get('/locations', h(async (req, res) => {
  const rows = (await query(
    'SELECT id, name, type, description, lat, lng FROM campus_locations WHERE is_active ORDER BY type, name'
  )).rows;
  res.json({ locations: rows });
}));

// Everything the map shows: places, upcoming events at a known place, open lost/found reports at a known place.
router.get('/map', h(async (req, res) => {
  const locations = (await query(
    'SELECT id, name, type, description, lat, lng FROM campus_locations WHERE is_active ORDER BY type, name'
  )).rows;
  const events = (await query(
    `SELECT e.id, e.title, e.starts_at, e.location_id FROM events e
     WHERE e.location_id IS NOT NULL AND e.starts_at >= now()
       AND (e.branch_scope = 'all_branches' OR e.academic_unit_id = $2 OR e.created_by = $1 OR $3::boolean)
     ORDER BY e.starts_at`,
    [req.user.id, req.user.academic_unit_id, req.user.role === 'admin']
  )).rows;
  const items = (await query(
    `SELECT id, type, title, location_id FROM lost_found_items
     WHERE location_id IS NOT NULL AND status <> 'resolved' ORDER BY created_at DESC`
  )).rows;
  res.json({
    locations,
    events: events.map((e) => ({ id: e.id, title: e.title, startsAt: e.starts_at, locationId: e.location_id })),
    items: items.map((i) => ({ id: i.id, type: i.type, title: i.title, locationId: i.location_id }))
  });
}));

router.get('/notifications', h(async (req, res) => {
  const rows = (await query(
    `SELECT id, type, title, body, link, read_at, created_at FROM notifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`,
    [req.user.id]
  )).rows;
  const unread = (await query('SELECT count(*)::int AS n FROM notifications WHERE user_id = $1 AND read_at IS NULL', [req.user.id])).rows[0].n;
  res.json({
    unreadCount: unread,
    notifications: rows.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: Boolean(n.read_at), createdAt: n.created_at }))
  });
}));

router.post('/notifications/read', h(async (req, res) => {
  await query('UPDATE notifications SET read_at = now() WHERE user_id = $1 AND read_at IS NULL', [req.user.id]);
  res.json({ ok: true });
}));

export default router;

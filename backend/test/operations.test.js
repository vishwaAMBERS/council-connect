// API tests for campus operations: uploads, events, grievances, lost and found, map, notifications.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

process.env.PGLITE_DATA_DIR = 'memory://';
// TEST_DATABASE_URL points the suite at a real PostgreSQL server; by default it uses the in-memory database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.ANTHROPIC_API_KEY = ''; // keyword rules only: no network in tests
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOADS_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-uploads-'));

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/db/migrate.js');
const { seed, DEMO_PASSWORD } = await import('../src/db/seed.js');
const { query, closeDb } = await import('../src/db/index.js');
const { flushCategoriser, classifyGrievanceByRules } = await import('../src/services/categoriser.js');
const { escalateOverdue } = await import('../src/routes/grievances.js');
const { similarity, MATCH_THRESHOLD } = await import('../src/services/matching.js');

let server;
let base;
const tokens = {};

async function api(method, route, { as, body } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json() };
}

async function upload(as, bytes, type, name = 'photo') {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const response = await fetch(`${base}/uploads`, { method: 'POST', headers: { Authorization: `Bearer ${tokens[as]}` }, body: form });
  return { status: response.status, body: await response.json() };
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const inDays = (days) => new Date(Date.now() + days * 86400000).toISOString();
const unread = async (as) => (await api('GET', '/notifications', { as })).body;

before(async () => {
  await migrate({ log: () => {} });
  await seed({ log: () => {} });
  server = createApp({ logRequests: false }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['student', 'student2', 'student3', 'hod', 'it_gs', 'cse_gs', 'it_cr3', 'it_cr2', 'it_cultural']) {
    const { status, body } = await api('POST', '/auth/login', { body: { email: `${name}@geca.ac.in`, password: DEMO_PASSWORD } });
    assert.equal(status, 200, `login ${name}`);
    tokens[name] = body.token;
  }
});

after(async () => {
  await flushCategoriser();
  await new Promise((resolve) => server.close(resolve));
  await closeDb();
  fs.rmSync(process.env.UPLOADS_DIR, { recursive: true, force: true });
});

test('session: capabilities follow role and verification', async () => {
  const caps = async (as) => (await api('GET', '/auth/me', { as })).body.user;
  assert.equal((await caps('student')).canCreateEvents, false);
  assert.equal((await caps('it_cr3')).canCreateEvents, true);
  assert.equal((await caps('it_cr2')).canCreateEvents, false, 'unverified representative');
  assert.equal((await caps('it_cr2')).canHandleGrievances, false);
  assert.equal((await caps('hod')).canHandleGrievances, true);
});

test('uploads: images only, checked by content, usable as profile photo', async () => {
  const noAuth = await fetch(`${base}/uploads`, { method: 'POST' });
  assert.equal(noAuth.status, 401);

  const fake = await upload('student', Buffer.from('<script>alert(1)</script>'), 'image/png');
  assert.equal(fake.status, 400, 'content must match the declared image type');
  const text = await upload('student', Buffer.from('hello'), 'text/plain');
  assert.equal(text.status, 400);

  const ok = await upload('student', PNG, 'image/png');
  assert.equal(ok.status, 201);
  assert.match(ok.body.url, /^\/uploads\/[0-9a-f-]{36}\.png$/);

  const served = await fetch(base + ok.body.url);
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'image/png');
  assert.equal(served.headers.get('x-content-type-options'), 'nosniff');

  const bad = await api('PATCH', '/users/me', { as: 'student', body: { avatarUrl: 'https://evil.example/x.png' } });
  assert.equal(bad.status, 400);
  const set = await api('PATCH', '/users/me', { as: 'student', body: { avatarUrl: ok.body.url } });
  assert.equal(set.body.user.avatarUrl, ok.body.url);
  const cleared = await api('PATCH', '/users/me', { as: 'student', body: { avatarUrl: null } });
  assert.equal(cleared.body.user.avatarUrl, null);
});

test('events: only verified representatives publish; scope controls who sees them', async () => {
  const event = { title: 'DBMS Quiz', description: 'Inter-class quiz.', venue: 'Room 204', startsAt: inDays(3), branchScope: 'own_branch', capacity: 1 };

  assert.equal((await api('POST', '/events', { as: 'student', body: event })).status, 403);
  assert.equal((await api('POST', '/events', { as: 'it_cr2', body: event })).status, 403, 'unverified representative');
  assert.equal((await api('POST', '/events', { as: 'it_cr3', body: { ...event, startsAt: inDays(-1) } })).status, 400, 'must be in the future');
  assert.equal((await api('POST', '/events', { as: 'it_cr3', body: { ...event, title: '' } })).status, 400);

  const created = await api('POST', '/events', { as: 'it_cr3', body: event });
  assert.equal(created.status, 201);
  const id = created.body.event.id;
  assert.equal(created.body.event.unit.code, 'IT');

  const titles = async (as) => (await api('GET', '/events', { as })).body.events.map((e) => e.title);
  assert.ok((await titles('student')).includes('DBMS Quiz'), 'IT student sees an IT-only event');
  assert.ok(!(await titles('student2')).includes('DBMS Quiz'), 'CSE student does not');
  assert.ok((await titles('hod')).includes('DBMS Quiz'), 'admin sees everything');
  assert.ok((await titles('student2')).includes('CodeGECA Hackathon'), 'all-branch events are visible to everyone');
  assert.equal((await api('GET', `/events/${id}`, { as: 'student2' })).status, 404);

  const list = (await api('GET', '/events', { as: 'student' })).body;
  assert.equal(list.canCreate, false);
  const times = list.events.map((e) => new Date(e.startsAt).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => a - b), 'soonest first');
  const past = (await api('GET', '/events?when=past', { as: 'student' })).body.events;
  assert.ok(past.every((e) => e.isPast) && past.length >= 1);
});

test('events: register once, respect capacity, participant list and attendance (criterion 8)', async () => {
  const created = await api('POST', '/events', {
    as: 'it_gs', body: { title: 'Git Workshop', description: 'Hands-on.', venue: 'Lab 3', startsAt: inDays(2), capacity: 1 }
  });
  const id = created.body.event.id;

  assert.equal((await api('POST', `/events/${id}/register`, { as: 'it_cr3' })).status, 403, 'students only');
  const registered = await api('POST', `/events/${id}/register`, { as: 'student' });
  assert.equal(registered.status, 201);
  assert.equal(registered.body.event.isRegistered, true);
  assert.equal(registered.body.event.registrationCount, 1);
  assert.equal((await api('POST', `/events/${id}/register`, { as: 'student' })).status, 409, 'no double registration');
  const full = await api('POST', `/events/${id}/register`, { as: 'student2' });
  assert.equal(full.status, 409);
  assert.match(full.body.error, /full/);

  // The participant list is for the organiser and admins only.
  assert.equal((await api('GET', `/events/${id}`, { as: 'student' })).body.participants, null);
  const detail = await api('GET', `/events/${id}`, { as: 'it_gs' });
  assert.deepEqual(detail.body.participants.map((p) => p.fullName), ['Aditya Adhave']);

  const studentId = detail.body.participants[0].id;
  assert.equal((await api('PATCH', `/events/${id}/attendance`, { as: 'it_cr3', body: { studentId, attended: true } })).status, 403);
  assert.equal((await api('PATCH', `/events/${id}/attendance`, { as: 'it_gs', body: { studentId, attended: true } })).status, 200);
  assert.equal((await api('GET', `/events/${id}`, { as: 'hod' })).body.participants[0].attended, true);

  const cancelled = await api('DELETE', `/events/${id}/register`, { as: 'student' });
  assert.equal(cancelled.body.event.registrationCount, 0);
  assert.equal((await api('POST', `/events/${id}/register`, { as: 'student2' })).status, 201, 'seat freed');
});

test('grievances: submit, AI triage, handling flow, visibility (criterion 9)', async () => {
  assert.equal((await api('POST', '/grievances', { as: 'it_cr3', body: { title: 'x', description: 'y' } })).status, 403);
  assert.equal((await api('POST', '/grievances', { as: 'student', body: { title: '', description: 'y' } })).status, 400);

  const sent = await api('POST', '/grievances', {
    as: 'student',
    body: { title: 'Sparking socket near my bed', description: 'The plug socket sparks whenever anything is plugged in.', roomNumber: 'A-110' }
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.grievance.status, 'submitted');
  const id = sent.body.grievance.id;

  await flushCategoriser();
  const mine = await api('GET', '/grievances', { as: 'student' });
  assert.equal(mine.body.isHandler, false);
  assert.ok(mine.body.grievances.every((g) => g.raisedBy.fullName === 'Aditya Adhave'), 'students see only their own');
  const tracked = mine.body.grievances.find((g) => g.id === id);
  assert.equal(tracked.category, 'electrical');
  assert.equal(tracked.priority, 'critical');
  const hoursLeft = (new Date(tracked.escalationDueAt) - Date.now()) / 3600000;
  assert.ok(hoursLeft > 11 && hoursLeft <= 12, 'critical complaints get a 12-hour window');

  // Other students cannot see it; unverified representatives cannot handle it.
  assert.equal((await api('GET', `/grievances/${id}`, { as: 'student2' })).status, 404);
  assert.equal((await api('POST', `/grievances/${id}/take`, { as: 'it_cr2' })).status, 404);

  const queue = await api('GET', '/grievances', { as: 'it_cr3' });
  assert.equal(queue.body.isHandler, true);
  assert.ok(queue.body.grievances.some((g) => g.id === id));

  assert.equal((await api('POST', `/grievances/${id}/resolve`, { as: 'it_cr3', body: { note: 'done' } })).status, 409, 'take it first');
  assert.equal((await api('POST', `/grievances/${id}/take`, { as: 'it_cr3' })).body.grievance.status, 'assigned');
  assert.equal((await api('POST', `/grievances/${id}/start`, { as: 'it_cr3', body: { note: 'Electrician called.' } })).body.grievance.status, 'in_progress');
  assert.equal((await api('POST', `/grievances/${id}/resolve`, { as: 'it_cr3' })).status, 400, 'resolution note required');
  const resolved = await api('POST', `/grievances/${id}/resolve`, { as: 'it_cr3', body: { note: 'Socket replaced.' } });
  assert.equal(resolved.body.grievance.status, 'resolved');
  assert.equal((await api('POST', `/grievances/${id}/take`, { as: 'it_gs' })).status, 409);

  const detail = await api('GET', `/grievances/${id}`, { as: 'student' });
  assert.deepEqual(detail.body.history.map((entry) => entry.status), ['submitted', 'assigned', 'in_progress', 'resolved']);
  assert.equal(detail.body.grievance.resolutionNote, 'Socket replaced.');
  assert.deepEqual(detail.body.actions, { take: false, start: false, resolve: false, escalate: false });

  const notes = await unread('student');
  assert.ok(notes.notifications.some((n) => n.title === 'Your complaint was resolved' && n.link === `/grievances/${id}`));
});

test('grievances: timed and manual escalation hand the complaint to the HOD', async () => {
  const submit = async (title) => (await api('POST', '/grievances', { as: 'student2', body: { title, description: 'The mess food was stale again.' } })).body.grievance.id;

  // Timed: push the deadline into the past, then run the sweep.
  const overdue = await submit('Stale food in the mess');
  await flushCategoriser();
  assert.equal((await api('POST', `/grievances/${overdue}/take`, { as: 'it_cr3' })).status, 200);
  await query(`UPDATE grievances SET escalation_due_at = now() - interval '1 minute' WHERE id = $1`, [overdue]);
  assert.equal(await escalateOverdue(), 1);
  assert.equal(await escalateOverdue(), 0, 'escalates once');

  const afterSweep = await api('GET', `/grievances/${overdue}`, { as: 'student2' });
  assert.equal(afterSweep.body.grievance.status, 'escalated');
  assert.equal(afterSweep.body.history.at(-1).actorName, 'System');
  assert.equal((await api('POST', `/grievances/${overdue}/resolve`, { as: 'it_cr3', body: { note: 'x' } })).status, 403, 'representatives lose it after escalation');
  assert.ok((await unread('hod')).notifications.some((n) => n.title === 'Complaint escalated to you' && n.link === `/grievances/${overdue}`));

  assert.equal((await api('POST', `/grievances/${overdue}/take`, { as: 'hod' })).body.grievance.status, 'escalated');
  const closed = await api('POST', `/grievances/${overdue}/resolve`, { as: 'hod', body: { note: 'Mess contractor warned; menu changed.' } });
  assert.equal(closed.body.grievance.status, 'resolved');

  // Manual: only the student who raised it, with a reason, once.
  const manual = await submit('Mess plates are not washed properly');
  assert.equal((await api('POST', `/grievances/${manual}/escalate`, { as: 'student', body: { reason: 'x' } })).status, 404);
  assert.equal((await api('POST', `/grievances/${manual}/escalate`, { as: 'it_cr3', body: { reason: 'x' } })).status, 403);
  assert.equal((await api('POST', `/grievances/${manual}/escalate`, { as: 'student2', body: {} })).status, 400);
  const escalated = await api('POST', `/grievances/${manual}/escalate`, { as: 'student2', body: { reason: 'Reported three times with no reply.' } });
  assert.equal(escalated.body.grievance.status, 'escalated');
  assert.equal((await api('POST', `/grievances/${manual}/escalate`, { as: 'student2', body: { reason: 'again' } })).status, 409);
});

test('lost and found: a similar report creates a match, notifies both, opens a private thread (criterion 10)', async () => {
  const posted = await api('POST', '/lost-found', {
    as: 'student',
    body: { type: 'lost', title: 'Blue water bottle', description: 'Steel blue bottle with a GECA sticker, left on a canteen table.', location: 'Canteen' }
  });
  assert.equal(posted.status, 201);
  assert.equal(posted.body.matchCount, 1);
  assert.equal(posted.body.item.status, 'matched');

  const mine = (await api('GET', '/lost-found/matches', { as: 'student' })).body.matches;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].found.title, 'Blue steel water bottle');
  assert.equal(mine[0].otherPartyName, 'Meera Kulkarni');
  const matchId = mine[0].id;

  for (const who of ['student', 'student2']) {
    assert.ok((await unread(who)).notifications.some((n) => n.title === 'Possible match for your item' && n.link === `/lost-found?match=${matchId}`), who);
  }

  // Only the two parties can read or write the thread.
  assert.equal((await api('GET', `/lost-found/matches/${matchId}/messages`, { as: 'student3' })).status, 404);
  assert.equal((await api('POST', `/lost-found/matches/${matchId}/messages`, { as: 'student', body: { content: 'I think that is mine. Does it have a dent near the cap?' } })).status, 201);
  const thread = await api('GET', `/lost-found/matches/${matchId}/messages`, { as: 'student2' });
  assert.equal(thread.body.messages.length, 1);

  // An unrelated report does not match; nobody matches their own reports.
  const unrelated = await api('POST', '/lost-found', {
    as: 'student', body: { type: 'lost', title: 'Red umbrella', description: 'Folding umbrella with a wooden handle.', location: 'Central Library' }
  });
  assert.equal(unrelated.body.matchCount, 0);
  const own = await api('POST', '/lost-found', {
    as: 'student2', body: { type: 'lost', title: 'Blue steel water bottle', description: 'Blue steel water bottle with a GECA sticker.', location: 'Canteen' }
  });
  assert.equal(own.body.matchCount, 0);

  assert.equal((await api('POST', '/lost-found', { as: 'student', body: { type: 'stolen', title: 'x', description: 'y', location: 'z' } })).status, 400);

  // The owner closes the report; other people stop seeing it.
  assert.equal((await api('POST', `/lost-found/${posted.body.item.id}/resolve`, { as: 'student2' })).status, 404);
  assert.equal((await api('POST', `/lost-found/${posted.body.item.id}/resolve`, { as: 'student' })).body.item.status, 'resolved');
  const others = (await api('GET', '/lost-found', { as: 'student3' })).body.items;
  assert.ok(!others.some((item) => item.id === posted.body.item.id));
});

test('map: locations plus pinned events and items (criterion 11)', async () => {
  const map = (await api('GET', '/map', { as: 'student' })).body;
  for (const type of ['department', 'hostel', 'office', 'venue']) {
    assert.ok(map.locations.some((l) => l.type === type), `${type} markers`);
  }
  const byId = Object.fromEntries(map.locations.map((l) => [l.id, l.name]));
  const hackathon = map.events.find((e) => e.title === 'CodeGECA Hackathon');
  assert.equal(byId[hackathon.locationId], 'CSE and IT Department');
  assert.ok(map.items.some((i) => byId[i.locationId] === 'Main Auditorium'));

  // Creating an event at a known place pins it automatically.
  const place = map.locations.find((l) => l.name === 'Main Auditorium');
  const created = await api('POST', '/events', { as: 'it_gs', body: { title: 'Alumni Talk', description: 'Guest talk.', locationId: place.id, startsAt: inDays(4) } });
  assert.equal(created.body.event.venue, 'Main Auditorium');
  assert.ok((await api('GET', '/map', { as: 'student3' })).body.events.some((e) => e.title === 'Alumni Talk' && e.locationId === place.id));
});

test('notifications: governance events notify, and read marks them', async () => {
  const cr = (await api('GET', '/directory?search=Neha%20Joshi', { as: 'student3' })).body.members[0];
  const sent = await api('POST', '/contact-requests', { as: 'student3', body: { toUserId: cr.userId, reasonTitle: 'Bonafide certificate', description: 'How do I apply for one?' } });
  assert.ok((await unread('it_cr3')).notifications.some((n) => n.link === `/messages?request=${sent.body.request.id}`));
  await api('POST', `/contact-requests/${sent.body.request.id}/approve`, { as: 'it_cr3' });

  const before = await unread('student3');
  assert.ok(before.unreadCount >= 1);
  assert.ok(before.notifications.some((n) => /approved your contact request/.test(n.title)));
  await api('POST', '/notifications/read', { as: 'student3' });
  assert.equal((await unread('student3')).unreadCount, 0);
});

test('rules: grievance triage and item similarity', () => {
  assert.deepEqual(classifyGrievanceByRules('Wi-Fi not working since yesterday in block B'), { category: 'wifi', priority: 'high' });
  assert.deepEqual(classifyGrievanceByRules('Chair leg is loose, minor issue'), { category: 'infrastructure', priority: 'low' });
  assert.deepEqual(classifyGrievanceByRules('Food poisoning after dinner in the mess'), { category: 'mess', priority: 'critical' });

  const bottle = { title: 'Blue water bottle', description: 'Steel blue bottle with a GECA sticker', location: 'Canteen' };
  assert.ok(similarity(bottle, { title: 'Blue steel water bottle', description: 'Blue steel bottle found on a table', location: 'Canteen' }) >= MATCH_THRESHOLD);
  assert.ok(similarity(bottle, { title: 'Black wallet', description: 'Leather wallet with ID card', location: 'Canteen' }) < MATCH_THRESHOLD, 'same place alone is not a match');
});

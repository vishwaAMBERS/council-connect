// API tests for oversight: analytics, audit log, archive, event reminders.
process.env.PGLITE_DATA_DIR = 'memory://';
// TEST_DATABASE_URL points the suite at a real PostgreSQL server; by default it uses the in-memory database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.ANTHROPIC_API_KEY = '';
process.env.JWT_SECRET = 'test-secret';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/db/migrate.js');
const { seed, DEMO_PASSWORD } = await import('../src/db/seed.js');
const { query, closeDb } = await import('../src/db/index.js');
const { flushCategoriser } = await import('../src/services/categoriser.js');
const { sendEventReminders } = await import('../src/routes/events.js');

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

async function login(name) {
  const { status, body } = await api('POST', '/auth/login', { body: { email: `${name}@geca.ac.in`, password: DEMO_PASSWORD } });
  assert.equal(status, 200, `login ${name}`);
  tokens[name] = body.token;
  return body.user;
}

before(async () => {
  await migrate({ log: () => {} });
  await seed({ log: () => {} });
  server = createApp({ logRequests: false }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['student', 'student2', 'hod', 'it_gs', 'it_cr3']) await login(name);
});

after(async () => {
  await flushCategoriser();
  await new Promise((resolve) => server.close(resolve));
  await closeDb();
});

test('analytics: admin only, numbers come from live data', async () => {
  assert.equal((await api('GET', '/analytics', { as: 'student' })).status, 403);
  assert.equal((await api('GET', '/analytics', { as: 'it_gs' })).status, 403);

  const before = (await api('GET', '/analytics', { as: 'hod' })).body;
  assert.equal(before.governance.activeMembers, 20);
  assert.equal(before.governance.verifiedMembers + before.governance.unverifiedMembers, 20);
  assert.equal(before.governance.byCouncil.reduce((sum, c) => sum + c.total, 0), 20);
  assert.equal(before.governance.byCouncil[0].code, 'MAIN');
  assert.equal(before.governance.requests.total, 3);
  assert.equal(before.governance.requests.pending, 2);
  assert.equal(before.governance.requests.avgResponseHours, 1, 'the seeded approved request was answered after one hour');
  assert.equal(before.events.total, 4);
  assert.equal(before.events.upcoming, 3);
  assert.equal(before.events.attendanceRate, 50, 'one of two past registrations attended');
  assert.equal(before.events.engagementRate, 67, 'two of three students registered for something');
  assert.equal(before.grievances.total, 3);
  assert.equal(before.grievances.escalatedOpen, 1);
  assert.equal(before.grievances.avgResolutionHours, 24);
  assert.equal(before.lostFound.open, 3);

  // Activity moves the numbers.
  await api('POST', '/grievances', { as: 'student', body: { title: 'Fan not working', description: 'The ceiling fan stopped working.' } });
  await flushCategoriser();
  const hackathon = (await api('GET', '/events', { as: 'student' })).body.events.find((e) => e.title === 'CodeGECA Hackathon');
  await api('POST', `/events/${hackathon.id}/register`, { as: 'student' });

  const after = (await api('GET', '/analytics', { as: 'hod' })).body;
  assert.equal(after.grievances.total, 4);
  assert.equal(after.grievances.byCategory.find((c) => c.category === 'electrical').count, 2);
  assert.deepEqual(after.grievances.byPriority.map((p) => p.priority), ['high', 'medium', 'low'], 'most severe first');
  assert.equal(after.events.registrations, before.events.registrations + 1);
  assert.equal(after.events.engagementRate, 100);
  assert.equal(after.events.top[0].title, 'CodeGECA Hackathon');
  assert.ok(after.engagement.activeLast7Days >= 1);
});

test('audit log: actions are recorded with actor and can be filtered', async () => {
  assert.equal((await api('GET', '/audit-logs', { as: 'it_gs' })).status, 403);

  const tech = (await api('GET', '/directory?search=Yash%20Gaikwad', { as: 'it_gs' })).body.members[0];
  await api('POST', `/council-profiles/${tech.profileId}/verify`, { as: 'it_gs' });
  const event = await api('POST', '/events', {
    as: 'it_gs', body: { title: 'Audit Demo Talk', description: 'Talk.', venue: 'Room 1', startsAt: new Date(Date.now() + 5 * 86400000).toISOString() }
  });
  assert.equal(event.status, 201);

  const all = (await api('GET', '/audit-logs', { as: 'hod' })).body;
  const find = (action, text) => all.logs.find((l) => l.action === action && l.summary.includes(text));
  assert.equal(find('member.verified', 'Yash Gaikwad').actorName, 'Rohan Patil');
  assert.equal(find('event.created', 'Audit Demo Talk').actorName, 'Rohan Patil');
  assert.ok(find('grievance.submitted', 'Fan not working'));
  assert.ok(find('member.verified', 'Sneha Kulkarni'), 'earlier verifications were carried into the log');
  assert.equal(find('grievance.escalated', 'No water supply').actorName, 'System');
  assert.ok(all.entities.includes('member') && all.entities.includes('grievance') && all.entities.includes('event'));
  const times = all.logs.map((l) => new Date(l.createdAt).getTime());
  assert.deepEqual(times, [...times].sort((a, b) => b - a), 'newest first');

  const onlyMembers = (await api('GET', '/audit-logs?entity=member', { as: 'hod' })).body.logs;
  assert.ok(onlyMembers.length > 0 && onlyMembers.every((l) => l.action.startsWith('member.')));
});

test('event reminders: sent once to registered students, only for events within 24 hours', async () => {
  const soon = await api('POST', '/events', {
    as: 'it_gs', body: { title: 'Tomorrow Morning Meetup', description: 'Meetup.', venue: 'Canteen', startsAt: new Date(Date.now() + 6 * 3600000).toISOString() }
  });
  await api('POST', `/events/${soon.body.event.id}/register`, { as: 'student' });
  await api('POST', `/events/${soon.body.event.id}/register`, { as: 'student2' });

  assert.equal(await sendEventReminders(), 2);
  assert.equal(await sendEventReminders(), 0, 'no second reminder');
  const notes = (await api('GET', '/notifications', { as: 'student2' })).body.notifications;
  assert.ok(notes.some((n) => n.title === 'Reminder: Tomorrow Morning Meetup'));
  assert.ok(!notes.some((n) => n.title === 'Reminder: CodeGECA Hackathon'), 'the hackathon is days away');
});

test('invite codes: issued within scope, used once, revocable while unused', async () => {
  assert.equal((await api('GET', '/invite-codes', { as: 'student' })).status, 403);
  assert.equal((await api('GET', '/invite-codes/options', { as: 'it_cr3' })).status, 403, 'only admins and General Secretaries');

  // A General Secretary: own council only, and never the GS seat.
  const gsOptions = (await api('GET', '/invite-codes/options', { as: 'it_gs' })).body;
  assert.equal(gsOptions.canIssueAdmin, false);
  assert.deepEqual(gsOptions.councils.map((c) => c.name), ['IT Departmental Council']);
  assert.ok(!gsOptions.councils[0].positions.some((p) => p.value === 'general_secretary'));
  const itCouncil = gsOptions.councils[0].id;

  const adminOptions = (await api('GET', '/invite-codes/options', { as: 'hod' })).body;
  assert.equal(adminOptions.canIssueAdmin, true);
  assert.equal(adminOptions.councils.length, 9);
  const cse = adminOptions.councils.find((c) => c.name === 'CSE Departmental Council');
  const main = adminOptions.councils.find((c) => c.name === 'Main Student Council');
  assert.ok(main.positions.some((p) => p.value === 'president') && !main.positions.some((p) => p.value === 'general_secretary'));

  const issue = (as, body) => api('POST', '/invite-codes', { as, body });
  assert.equal((await issue('it_gs', { role: 'admin' })).status, 403);
  assert.equal((await issue('it_gs', { councilId: cse.id, position: 'cultural_member' })).status, 403, 'another branch');
  assert.equal((await issue('it_gs', { councilId: itCouncil, position: 'general_secretary' })).status, 400);
  assert.equal((await issue('hod', { councilId: main.id, position: 'class_representative' })).status, 400, 'not a main-council seat');
  assert.equal((await issue('hod', { councilId: cse.id, position: 'sports_member', expiresInDays: 0 })).status, 400);

  const issued = await issue('it_gs', { councilId: itCouncil, position: 'sports_member' });
  assert.equal(issued.status, 201);
  assert.match(issued.body.code.code, /^IT-[A-Z2-9]{6}$/);
  assert.equal(issued.body.code.positionTitle, 'Sports Member');
  assert.equal(issued.body.code.status, 'unused');
  assert.equal(issued.body.code.termStart.slice(4), '-07-01');

  // The code creates an unverified council account, once.
  const signup = (email) => api('POST', '/auth/register', {
    body: { fullName: 'Sports Member', email, password: 'password1', year: 2, inviteCode: issued.body.code.code }
  });
  const joined = await signup('it_sportsmem@geca.ac.in');
  assert.equal(joined.status, 201);
  assert.equal(joined.body.user.role, 'representative');
  assert.equal(joined.body.user.canCreateEvents, false, 'unverified until the GS verifies them');
  assert.equal((await signup('second_try@geca.ac.in')).status, 400);

  const listForGs = (await api('GET', '/invite-codes', { as: 'it_gs' })).body.codes;
  const used = listForGs.find((c) => c.code === issued.body.code.code);
  assert.equal(used.status, 'used');
  assert.equal(used.usedByName, 'Sports Member');
  assert.ok(listForGs.every((c) => c.councilName === 'IT Departmental Council'), 'a GS sees only their council');
  assert.equal((await api('DELETE', `/invite-codes/${used.code}`, { as: 'it_gs' })).status, 409, 'used codes stay on record');

  // Admin codes, and revoking an unused one.
  const adminCode = await issue('hod', { role: 'admin' });
  assert.match(adminCode.body.code.code, /^ADMIN-/);
  assert.equal((await api('DELETE', `/invite-codes/${adminCode.body.code.code}`, { as: 'it_gs' })).status, 404, 'not visible to a GS');
  assert.equal((await api('DELETE', `/invite-codes/${adminCode.body.code.code}`, { as: 'hod' })).status, 200);
  const afterRevoke = await api('POST', '/auth/register', {
    body: { fullName: 'Not Admin', email: 'notadmin@geca.ac.in', password: 'password1', inviteCode: adminCode.body.code.code }
  });
  assert.equal(afterRevoke.status, 400);

  const logs = (await api('GET', '/audit-logs?entity=invite', { as: 'hod' })).body.logs.map((l) => l.action);
  assert.ok(logs.includes('invite.created') && logs.includes('invite.revoked'));
});

test('security: headers are set and repeated sign-in attempts are slowed down', async () => {
  const health = await fetch(`${base}/health`);
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(health.headers.get('strict-transport-security'));
  assert.equal(health.headers.get('x-powered-by'), null);

  let last;
  for (let i = 0; i < 31; i += 1) {
    last = await api('POST', '/auth/login', { body: { email: 'student@geca.ac.in', password: 'wrong-password' } });
    if (last.status === 429) break;
  }
  assert.equal(last.status, 429);
  assert.match(last.body.error, /Too many sign-in attempts/);
});

test('archive: browse a past year by branch (criterion 12)', async () => {
  const latest = (await api('GET', '/archive', { as: 'student' })).body;
  assert.deepEqual(latest.years, ['2025-26']);
  assert.equal(latest.year, '2025-26');
  assert.equal(latest.records.length, 12);

  const it = (await api('GET', '/archive?year=2025-26&unit=IT', { as: 'student' })).body.records;
  assert.equal(it.length, 4);
  const gs = it.find((r) => r.position === 'general_secretary');
  assert.equal(gs.fullName, 'Sanjana Kale');
  assert.equal(gs.termStart, '2025-07-01');
  assert.equal(gs.wasVerified, true);
  assert.equal(gs.verifiedByName, 'Dr. A. V. Kulkarni');
  assert.equal(it.find((r) => r.fullName === 'Mihir Joshi').verifiedByName, 'Sanjana Kale');

  const main = (await api('GET', '/archive?unit=MAIN', { as: 'student' })).body.records;
  assert.ok(main.length === 3 && main.every((r) => r.councilType === 'main'));
  assert.equal((await api('GET', '/archive?year=1999-00', { as: 'student' })).body.records.length, 0);
});

test('archive: closing the year snapshots and clears the council', async () => {
  assert.equal((await api('POST', '/archive/run', { as: 'it_gs', body: { academicYear: '2026-27' } })).status, 403);
  assert.equal((await api('POST', '/archive/run', { as: 'hod', body: { academicYear: '2026' } })).status, 400);
  assert.equal((await api('POST', '/archive/run', { as: 'hod', body: { academicYear: '2026-28' } })).status, 400);
  // 20 seeded members plus the one who joined with an invite code in the test above.
  assert.equal((await api('GET', '/archive/preview', { as: 'hod' })).body.activeProfiles, 21);

  // Give the IT General Secretary something to show in the snapshot.
  const pending = (await api('GET', '/contact-requests/inbox', { as: 'it_gs' })).body.requests.find((r) => r.status === 'pending');
  await api('POST', `/contact-requests/${pending.id}/approve`, { as: 'it_gs' });

  const run = await api('POST', '/archive/run', { as: 'hod', body: { academicYear: '2026-27' } });
  assert.equal(run.status, 201);
  assert.equal(run.body.archived, 21);

  // The directory is empty and the seat holders are ordinary students again.
  assert.equal((await api('GET', '/directory', { as: 'student' })).body.members.length, 0);
  const formerGs = (await api('GET', '/auth/me', { as: 'it_gs' })).body.user;
  assert.equal(formerGs.role, 'student');
  assert.equal(formerGs.canVerify, false);
  assert.equal(formerGs.canCreateEvents, false);
  assert.equal((await api('GET', '/auth/me', { as: 'hod' })).body.user.role, 'admin');

  const archive = (await api('GET', '/archive', { as: 'student' })).body;
  assert.deepEqual(archive.years, ['2026-27', '2025-26']);
  assert.equal(archive.year, '2026-27', 'newest year by default');
  assert.equal(archive.records.length, 21);
  const gs = (await api('GET', '/archive?year=2026-27&unit=IT', { as: 'student' })).body.records.find((r) => r.fullName === 'Rohan Patil');
  assert.equal(gs.positionTitle, 'General Secretary');
  assert.equal(gs.wasVerified, true);
  assert.equal(gs.verifiedByName, 'Dr. A. V. Kulkarni');
  assert.ok(gs.eventsCount >= 3, 'events organised during the term');
  assert.equal(gs.requestsHandled, 1);
  assert.equal(gs.grievancesResolved, 1);

  // Nothing left to archive, and the action is in the audit log.
  assert.equal((await api('POST', '/archive/run', { as: 'hod', body: { academicYear: '2026-27' } })).status, 409);
  const logs = (await api('GET', '/audit-logs?entity=archive', { as: 'hod' })).body.logs;
  assert.match(logs[0].summary, /archived 21 council seats/);

  // Existing conversations survive; new requests to former members are refused.
  const thread = (await api('GET', `/contact-requests/${pending.id}/messages`, { as: 'it_gs' }));
  assert.equal(thread.status, 200);
  assert.equal((await query('SELECT count(*)::int AS n FROM council_profiles WHERE is_active')).rows[0].n, 0);
});

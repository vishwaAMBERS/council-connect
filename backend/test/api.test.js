// End-to-end API tests for the governance core. Runs against an in-memory database.
process.env.PGLITE_DATA_DIR = 'memory://';
// TEST_DATABASE_URL points the suite at a real PostgreSQL server; by default it uses the in-memory database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';
process.env.ANTHROPIC_API_KEY = ''; // keyword rules only: no network in tests
process.env.JWT_SECRET = 'test-secret';

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';

const { createApp } = await import('../src/app.js');
const { migrate } = await import('../src/db/migrate.js');
const { seed, DEMO_PASSWORD } = await import('../src/db/seed.js');
const { query, closeDb } = await import('../src/db/index.js');
const { flushCategoriser, categoriseByRules } = await import('../src/services/categoriser.js');

let server;
let base;
const tokens = {};

async function api(method, path, { as, body } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(as ? { Authorization: `Bearer ${tokens[as]}` } : {})
    },
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

const users = {};
const member = async (as, namePart) => {
  const { body } = await api('GET', `/directory?search=${encodeURIComponent(namePart)}`, { as });
  assert.equal(body.members.length, 1, `directory search "${namePart}"`);
  return body.members[0];
};

before(async () => {
  await migrate({ log: () => {} });
  await seed({ log: () => {} });
  server = createApp({ logRequests: false }).listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
  for (const name of ['student', 'student2', 'hod', 'it_gs', 'cse_gs', 'it_cr3', 'it_technical']) {
    users[name] = await login(name);
  }
});

after(async () => {
  await flushCategoriser();
  await new Promise((resolve) => server.close(resolve));
  await closeDb();
});

test('auth: rejects bad credentials and unauthenticated access', async () => {
  assert.equal((await api('POST', '/auth/login', { body: { email: 'student@geca.ac.in', password: 'wrong' } })).status, 401);
  assert.equal((await api('GET', '/directory')).status, 401);
  const me = await api('GET', '/auth/me', { as: 'student' });
  assert.equal(me.body.user.role, 'student');
  assert.equal(me.body.user.unit.code, 'IT');
  assert.equal(me.body.user.passwordHash, undefined);
  assert.equal(me.body.user.password_hash, undefined);
});

test('register: students self-register with a college email only', async () => {
  const good = await api('POST', '/auth/register', {
    body: { fullName: 'New Student', email: 'new.student@geca.ac.in', password: 'password1', unitCode: 'CIVIL', year: 1 }
  });
  assert.equal(good.status, 201);
  assert.equal(good.body.user.role, 'student');

  const outside = await api('POST', '/auth/register', {
    body: { fullName: 'Outsider', email: 'someone@gmail.com', password: 'password1', unitCode: 'IT', year: 1 }
  });
  assert.equal(outside.status, 400);

  const duplicate = await api('POST', '/auth/register', {
    body: { fullName: 'Dup', email: 'student@geca.ac.in', password: 'password1', unitCode: 'IT', year: 1 }
  });
  assert.equal(duplicate.status, 409);
});

test('register: council roles need a valid, single-use invite code', async () => {
  const noCode = await api('POST', '/auth/register', {
    body: { fullName: 'Sneaky', email: 'sneaky@geca.ac.in', password: 'password1', unitCode: 'IT', year: 2, role: 'admin' }
  });
  assert.equal(noCode.status, 400);

  const badCode = await api('POST', '/auth/register', {
    body: { fullName: 'Sneaky', email: 'sneaky@geca.ac.in', password: 'password1', unitCode: 'IT', year: 2, inviteCode: 'NOPE' }
  });
  assert.equal(badCode.status, 400);

  const rep = await api('POST', '/auth/register', {
    body: { fullName: 'Co Tech', email: 'it_cotech@geca.ac.in', password: 'password1', year: 3, inviteCode: 'IT-COTECH-2026' }
  });
  assert.equal(rep.status, 201);
  assert.equal(rep.body.user.role, 'representative');
  assert.equal(rep.body.user.unit.code, 'IT');
  tokens.it_cotech = rep.body.token;

  const listed = await member('student', 'Co Tech');
  assert.equal(listed.positionTitle, 'Co-Technical Secretary');
  assert.equal(listed.isVerified, false);

  const reuse = await api('POST', '/auth/register', {
    body: { fullName: 'Second', email: 'second@geca.ac.in', password: 'password1', year: 3, inviteCode: 'IT-COTECH-2026' }
  });
  assert.equal(reuse.status, 400);
});

test('directory: search and filters', async () => {
  const all = await api('GET', '/directory', { as: 'student' });
  assert.ok(all.body.members.length >= 20);

  const itGs = await api('GET', '/directory?unit=IT&position=gs', { as: 'student' });
  assert.deepEqual(itGs.body.members.map((m) => m.fullName), ['Rohan Patil']);

  const crs = await api('GET', '/directory?position=cr&unit=IT', { as: 'student' });
  assert.equal(crs.body.members.length, 2);
  assert.ok(crs.body.members.every((m) => m.position === 'class_representative'));

  const main = await api('GET', '/directory?unit=MAIN', { as: 'student' });
  assert.ok(main.body.members.every((m) => m.council.type === 'main'));

  assert.equal((await api('GET', '/directory?position=bogus', { as: 'student' })).status, 400);
});

test('profile: role-aware, with verification details and contact state', async () => {
  const gs = await member('student', 'Rohan Patil');
  const { body } = await api('GET', `/users/${gs.userId}`, { as: 'student' });
  assert.equal(body.councilProfiles[0].positionTitle, 'General Secretary');
  assert.equal(body.councilProfiles[0].isVerified, true);
  assert.equal(body.councilProfiles[0].verifiedByName, 'Dr. A. V. Kulkarni');
  assert.equal(body.councilProfiles[0].termStart, '2026-07-01');
  assert.equal(body.user.email, undefined, 'email hidden from students');
  assert.equal(body.contact.canRequest, true);

  const asRep = await api('GET', `/users/${gs.userId}`, { as: 'cse_gs' });
  assert.equal(asRep.body.contact, null, 'only students get the contact request button');

  const about = await api('PATCH', '/users/me', { as: 'student', body: { about: 'x'.repeat(201) } });
  assert.equal(about.status, 400);
  const ok = await api('PATCH', '/users/me', { as: 'student', body: { about: 'Third year IT.' } });
  assert.equal(ok.body.user.about, 'Third year IT.');
});

test('contact request: submit, categorise, one active per pair, approve, then DM', async () => {
  const cr = await member('student', 'Neha Joshi');

  const tooLong = await api('POST', '/contact-requests', {
    as: 'student', body: { toUserId: cr.userId, reasonTitle: 'x'.repeat(81), description: 'd' }
  });
  assert.equal(tooLong.status, 400);

  const fromRep = await api('POST', '/contact-requests', {
    as: 'cse_gs', body: { toUserId: cr.userId, reasonTitle: 'Hi', description: 'Hello' }
  });
  assert.equal(fromRep.status, 403);

  const toStudent = await api('POST', '/contact-requests', {
    as: 'student', body: { toUserId: users.student2.id, reasonTitle: 'Hi', description: 'Hello' }
  });
  assert.equal(toStudent.status, 400);

  const sent = await api('POST', '/contact-requests', {
    as: 'student',
    body: { toUserId: cr.userId, reasonTitle: 'Attendance Shortage - Request Review', description: 'My attendance in DBMS shows 62% but I was present.' }
  });
  assert.equal(sent.status, 201);
  assert.equal(sent.body.request.status, 'pending');
  const id = sent.body.request.id;

  const again = await api('POST', '/contact-requests', {
    as: 'student', body: { toUserId: cr.userId, reasonTitle: 'Another', description: 'Second request' }
  });
  assert.equal(again.status, 409);

  // No messaging before approval, for either side.
  assert.equal((await api('GET', `/contact-requests/${id}/messages`, { as: 'student' })).status, 403);
  assert.equal((await api('POST', `/contact-requests/${id}/messages`, { as: 'student', body: { content: 'hello?' } })).status, 403);

  await flushCategoriser();
  const inbox = await api('GET', '/contact-requests/inbox', { as: 'it_cr3' });
  const card = inbox.body.requests.find((r) => r.id === id);
  assert.equal(card.category, 'academic');
  assert.equal(card.from.fullName, 'Aditya Adhave');
  assert.equal(card.from.unitCode, 'IT');

  // Outsiders cannot see or act on the request; the student cannot approve their own.
  assert.equal((await api('GET', `/contact-requests/${id}`, { as: 'student2' })).status, 404);
  assert.equal((await api('POST', `/contact-requests/${id}/approve`, { as: 'cse_gs' })).status, 404);
  assert.equal((await api('POST', `/contact-requests/${id}/approve`, { as: 'student' })).status, 403);

  const approved = await api('POST', `/contact-requests/${id}/approve`, { as: 'it_cr3' });
  assert.equal(approved.body.request.status, 'approved');
  assert.equal((await api('POST', `/contact-requests/${id}/decline`, { as: 'it_cr3' })).status, 409);

  const m1 = await api('POST', `/contact-requests/${id}/messages`, { as: 'student', body: { content: 'Thank you for approving.' } });
  assert.equal(m1.status, 201);
  await api('POST', `/contact-requests/${id}/messages`, { as: 'it_cr3', body: { content: 'Send me your roll number.' } });
  const thread = await api('GET', `/contact-requests/${id}/messages`, { as: 'it_cr3' });
  assert.deepEqual(thread.body.messages.map((m) => m.content), ['Thank you for approving.', 'Send me your roll number.']);
  assert.equal((await api('GET', `/contact-requests/${id}/messages`, { as: 'student2' })).status, 404);

  const profile = await api('GET', `/users/${cr.userId}`, { as: 'student' });
  assert.equal(profile.body.contact.request.status, 'approved');
  assert.equal(profile.body.contact.canRequest, false);
});

test('contact request: a decline blocks a new request for 24 hours', async () => {
  const rep = await member('student', 'Sakshi More');
  const sent = await api('POST', '/contact-requests', {
    as: 'student', body: { toUserId: rep.userId, reasonTitle: 'Gathering volunteers', description: 'Can I volunteer for the cultural fest?' }
  });
  tokens.it_cultural = (await api('POST', '/auth/login', { body: { email: 'it_cultural@geca.ac.in', password: DEMO_PASSWORD } })).body.token;
  const declined = await api('POST', `/contact-requests/${sent.body.request.id}/decline`, { as: 'it_cultural' });
  assert.equal(declined.body.request.status, 'declined');

  const tooSoon = await api('POST', '/contact-requests', {
    as: 'student', body: { toUserId: rep.userId, reasonTitle: 'Again', description: 'Trying again' }
  });
  assert.equal(tooSoon.status, 409);
  assert.ok(tooSoon.body.canRequestAt);

  await query(`UPDATE contact_requests SET resolved_at = now() - interval '25 hours' WHERE id = $1`, [sent.body.request.id]);
  const later = await api('POST', '/contact-requests', {
    as: 'student', body: { toUserId: rep.userId, reasonTitle: 'Again', description: 'Trying again a day later' }
  });
  assert.equal(later.status, 201);
});

test('verification: hierarchy is enforced server-side', async () => {
  const mechGs = await member('hod', 'Siddharth Chavan');   // unverified GS
  const itTech = await member('hod', 'Yash Gaikwad');       // unverified IT rep
  const cseCultural = await member('hod', 'Isha Wagh');     // unverified CSE rep
  const verify = (as, m) => api('POST', `/council-profiles/${m.profileId}/verify`, { as });

  // Students and ordinary reps cannot verify anyone.
  assert.equal((await verify('student', itTech)).status, 403);
  assert.equal((await verify('it_cr3', itTech)).status, 403);
  // Nobody verifies themselves.
  assert.equal((await verify('it_technical', itTech)).status, 403);
  // A GS cannot verify another GS, nor a rep of another branch.
  assert.equal((await verify('it_gs', mechGs)).status, 403);
  assert.equal((await verify('it_gs', cseCultural)).status, 403);
  // The HOD verifies General Secretaries, not branch reps.
  assert.equal((await verify('hod', itTech)).status, 403);

  const pendingForGs = await api('GET', '/verification/pending', { as: 'it_gs' });
  assert.ok(pendingForGs.body.members.every((m) => m.unit.code === 'IT' && m.position !== 'general_secretary'));
  assert.ok(pendingForGs.body.members.some((m) => m.profileId === itTech.profileId));

  const byGs = await verify('it_gs', itTech);
  assert.equal(byGs.status, 200);
  assert.equal(byGs.body.profile.isVerified, true);
  assert.equal(byGs.body.profile.verifiedByName, 'Rohan Patil');
  assert.equal((await verify('it_gs', itTech)).status, 409, 'verification is one-time');

  const byHod = await verify('hod', mechGs);
  assert.equal(byHod.status, 200);
  assert.equal((await member('student', 'Siddharth Chavan')).isVerified, true, 'badge shows in the directory');

  const profile = await api('GET', `/users/${cseCultural.userId}`, { as: 'cse_gs' });
  assert.equal(profile.body.councilProfiles[0].canVerify, true);
  const profileOther = await api('GET', `/users/${cseCultural.userId}`, { as: 'it_gs' });
  assert.equal(profileOther.body.councilProfiles[0].canVerify, false);

  assert.equal((await api('GET', '/verification/logs', { as: 'it_gs' })).status, 403);
  const logs = await api('GET', '/verification/logs', { as: 'hod' });
  assert.equal(logs.body.logs[0].member.fullName, 'Siddharth Chavan');
  assert.ok(logs.body.logs.some((l) => l.member.fullName === 'Yash Gaikwad' && l.verifiedBy.fullName === 'Rohan Patil'));
});

test('categoriser rules', () => {
  assert.equal(categoriseByRules('Attendance shortage in DBMS'), 'academic');
  assert.equal(categoriseByRules('Need volunteers for the cultural fest'), 'event');
  assert.equal(categoriseByRules('Seniors are ragging my roommate, exam tomorrow'), 'urgent');
  assert.equal(categoriseByRules('I would like to talk about a family situation'), 'personal');
});

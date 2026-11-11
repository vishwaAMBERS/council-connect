// Demo data for local development and the evaluation demo.
// Runs only when the database has no institution yet, so it never overwrites real data.
// Every seeded account uses the password in DEMO_PASSWORD.
import { pathToFileURL } from 'node:url';
import bcrypt from 'bcryptjs';
import { query, closeDb } from './index.js';
import { migrate } from './migrate.js';
import { POSITION_TITLES } from '../lib/positions.js';
import { seedOperations } from './seedOperations.js';
import { seedArchive } from './seedArchive.js';

export const DEMO_PASSWORD = 'demo1234';

const TERM = ['2026-07-01', '2027-06-30'];

export const UNITS = [
  ['CSE', 'Computer Science and Engineering', 'engineering_branch'],
  ['IT', 'Information Technology', 'engineering_branch'],
  ['MECH', 'Mechanical Engineering', 'engineering_branch'],
  ['ENTC', 'Electronics and Telecommunication Engineering', 'engineering_branch'],
  ['ELEC', 'Electrical Engineering', 'engineering_branch'],
  ['CIVIL', 'Civil Engineering', 'engineering_branch'],
  ['MCA', 'Master of Computer Applications', 'postgraduate_program'],
  ['MTECH', 'Master of Technology', 'postgraduate_program']
];

// [email prefix, name, home unit, year, council ('MAIN' or unit code), position, verified, about]
const COUNCIL_MEMBERS = [
  ['president', 'Sneha Kulkarni', 'ENTC', 4, 'MAIN', 'president', true, 'President of the Main Student Council.'],
  ['ladies_rep', 'Aarohi Deshmukh', 'CIVIL', 3, 'MAIN', 'ladies_representative', true, 'Here for any concern raised by women students.'],
  ['anti_ragging', 'Kunal Jadhav', 'MECH', 4, 'MAIN', 'anti_ragging_representative', true, 'Anti-ragging student representative. Reach out in confidence.'],
  ['main_tech', 'Omkar Shinde', 'CSE', 4, 'MAIN', 'technical_secretary', false, null],

  ['it_gs', 'Rohan Patil', 'IT', 4, 'IT', 'general_secretary', true, 'General Secretary, IT. Academic and department-level concerns.'],
  ['it_cultural', 'Sakshi More', 'IT', 3, 'IT', 'cultural_secretary', true, 'Cultural events and the IT annual gathering.'],
  ['it_technical', 'Yash Gaikwad', 'IT', 3, 'IT', 'technical_secretary', false, 'Workshops, hackathons and technical clubs.'],
  ['it_sports', 'Tejas Pawar', 'IT', 3, 'IT', 'sports_secretary', true, null],
  ['it_cr3', 'Neha Joshi', 'IT', 3, 'IT', 'class_representative', true, 'Class Representative, third year IT.'],
  ['it_cr2', 'Aditya Bhosale', 'IT', 2, 'IT', 'class_representative', false, 'Class Representative, second year IT.'],

  ['cse_gs', 'Rohit Sharma', 'CSE', 4, 'CSE', 'general_secretary', true, 'General Secretary, CSE.'],
  ['cse_cultural', 'Isha Wagh', 'CSE', 3, 'CSE', 'cultural_secretary', false, null],
  ['cse_technical', 'Pranav Kale', 'CSE', 3, 'CSE', 'technical_secretary', true, null],
  ['cse_cr3', 'Mrunal Sawant', 'CSE', 3, 'CSE', 'class_representative', false, null],

  ['mech_gs', 'Siddharth Chavan', 'MECH', 4, 'MECH', 'general_secretary', false, 'General Secretary, Mechanical.'],
  ['entc_gs', 'Pooja Thorat', 'ENTC', 4, 'ENTC', 'general_secretary', true, null],
  ['elec_gs', 'Priya Nair', 'ELEC', 4, 'ELEC', 'general_secretary', true, null],
  ['civil_gs', 'Akash Mane', 'CIVIL', 4, 'CIVIL', 'general_secretary', true, null],
  ['mca_gs', 'Shruti Kadam', 'MCA', 2, 'MCA', 'general_secretary', false, null],
  ['mtech_gs', 'Vivek Salunkhe', 'MTECH', 2, 'MTECH', 'general_secretary', true, null]
];

// [email prefix, name, unit, year]
const STUDENTS = [
  ['student', 'Aditya Adhave', 'IT', 3],
  ['student2', 'Meera Kulkarni', 'CSE', 2],
  ['student3', 'Farhan Shaikh', 'MECH', 1]
];

// [code, role, council, position]
const INVITES = [
  ['ADMIN-GECA-2026', 'admin', null, null],
  ['IT-COTECH-2026', 'representative', 'IT', 'co_technical_secretary'],
  ['IT-CULTMEM-2026', 'representative', 'IT', 'cultural_member'],
  ['CSE-SPORTS-2026', 'representative', 'CSE', 'sports_secretary'],
  ['MECH-TECH-2026', 'representative', 'MECH', 'technical_secretary'],
  ['MAIN-COSEC-2026', 'representative', 'MAIN', 'co_council_secretary']
];

const one = async (text, params) => (await query(text, params)).rows[0];

async function seedCore({ log = console.log } = {}) {
  if (await one('SELECT 1 AS x FROM institutions LIMIT 1')) return false;

  const hash = bcrypt.hashSync(DEMO_PASSWORD, 10);
  const inst = await one(
    `INSERT INTO institutions (name, code, email_domain) VALUES ($1, 'GECA', 'geca.ac.in') RETURNING id`,
    ['Government College of Engineering Aurangabad']
  );

  const unitId = {};
  const councilId = {};
  councilId.MAIN = (await one(
    `INSERT INTO councils (institution_id, name, type) VALUES ($1, 'Main Student Council', 'main') RETURNING id`,
    [inst.id]
  )).id;
  for (const [code, name, type] of UNITS) {
    unitId[code] = (await one(
      'INSERT INTO academic_units (institution_id, name, code, type) VALUES ($1, $2, $3, $4) RETURNING id',
      [inst.id, name, code, type]
    )).id;
    councilId[code] = (await one(
      `INSERT INTO councils (institution_id, academic_unit_id, name, type) VALUES ($1, $2, $3, 'departmental') RETURNING id`,
      [inst.id, unitId[code], `${code} Departmental Council`]
    )).id;
  }

  const addUser = async (prefix, name, unit, year, role, about = null) => (await one(
    `INSERT INTO users (institution_id, academic_unit_id, full_name, email, password_hash, role, year, about)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [inst.id, unit ? unitId[unit] : null, name, `${prefix}@geca.ac.in`, hash, role, year, about]
  )).id;

  const userId = {};
  userId.hod = await addUser('hod', 'Dr. A. V. Kulkarni', 'IT', null, 'admin', 'Head of Department and faculty admin.');
  for (const [prefix, name, unit, year] of STUDENTS) userId[prefix] = await addUser(prefix, name, unit, year, 'student');

  // General Secretaries first so the other members can point at them as parent and verifier.
  const profileId = {};
  const members = [...COUNCIL_MEMBERS].sort((a, b) => (b[5] === 'general_secretary') - (a[5] === 'general_secretary'));
  for (const [prefix, name, unit, year, council, position, verified, about] of members) {
    userId[prefix] = await addUser(prefix, name, unit, year, 'representative', about);
    const isTopLevel = position === 'general_secretary' || council === 'MAIN';
    const gsPrefix = `${council.toLowerCase()}_gs`;
    const verifier = isTopLevel ? userId.hod : userId[gsPrefix];
    profileId[prefix] = (await one(
      `INSERT INTO council_profiles
         (council_id, user_id, position, position_title, parent_profile_id, term_start, term_end, is_verified, verified_by, verified_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [
        councilId[council], userId[prefix], position, POSITION_TITLES[position],
        isTopLevel ? null : profileId[gsPrefix] || null, TERM[0], TERM[1],
        verified, verified ? verifier : null, verified ? '2026-07-14T10:00:00Z' : null
      ]
    )).id;
    if (verified) {
      await query(
        `INSERT INTO verification_logs (council_profile_id, verified_user_id, verified_by, position_title, council_name, verified_at)
         VALUES ($1, $2, $3, $4, $5, '2026-07-14T10:00:00Z')`,
        [profileId[prefix], userId[prefix], verifier, POSITION_TITLES[position], council === 'MAIN' ? 'Main Student Council' : `${council} Departmental Council`]
      );
    }
  }

  for (const [code, role, council, position] of INVITES) {
    await query(
      `INSERT INTO invite_codes (code, role, council_id, position, position_title, term_start, term_end, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [code, role, council ? councilId[council] : null, position, position ? POSITION_TITLES[position] : null,
        position ? TERM[0] : null, position ? TERM[1] : null, userId.hod]
    );
  }

  // A little history so inboxes are not empty on first login.
  await query(
    `INSERT INTO contact_requests (from_user_id, to_user_id, reason_title, description, category, category_source, created_at)
     VALUES ($1, $2, 'Hackathon team registration', 'Our team missed the registration form for the department hackathon. Can we still take part?', 'event', 'rules', now() - interval '3 hours'),
            ($3, $2, 'Unsafe situation near hostel gate', 'A group has been harassing first-year students near the hostel gate at night. Please look into this urgently.', 'urgent', 'rules', now() - interval '1 hour')`,
    [userId.student2, userId.it_gs, userId.student3]
  );
  const approved = await one(
    `INSERT INTO contact_requests (from_user_id, to_user_id, reason_title, description, category, category_source, status, created_at, resolved_at)
     VALUES ($1, $2, 'Lab timetable clash', 'The DBMS lab for our batch clashes with the elective lecture on Thursdays.', 'academic', 'rules', 'approved', now() - interval '2 days', now() - interval '47 hours')
     RETURNING id`,
    [userId.student2, userId.cse_gs]
  );
  await query(
    `INSERT INTO messages (request_id, sender_id, content, sent_at)
     VALUES ($1, $2, 'Thanks for approving. The clash is every Thursday 2 to 4 pm.', now() - interval '46 hours'),
            ($1, $3, 'Noted. I will raise it with the timetable coordinator tomorrow.', now() - interval '45 hours')`,
    [approved.id, userId.student2, userId.cse_gs]
  );

  // Seeded verifications also belong in the audit log (the migration only carries over rows that existed before it ran).
  await query(
    `INSERT INTO audit_logs (actor_id, actor_name, action, entity_type, entity_id, summary, created_at)
     SELECT l.verified_by, b.full_name, 'member.verified', 'council_profile', l.council_profile_id,
            'Verified ' || m.full_name || ' as ' || l.position_title || ' (' || l.council_name || ')', l.verified_at
     FROM verification_logs l JOIN users b ON b.id = l.verified_by JOIN users m ON m.id = l.verified_user_id`
  );

  log(`seeded demo data (${Object.keys(userId).length} users, password "${DEMO_PASSWORD}")`);
  return true;
}

/** Seeds whatever is still empty: core governance data, then the campus-operations data. */
export async function seed(options = {}) {
  const core = await seedCore(options);
  const operations = await seedOperations(options);
  const archive = await seedArchive(options);
  return core || operations || archive;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  migrate({ log: () => {} })
    .then(() => seed())
    .then((created) => { if (!created) console.log('database already has data, nothing seeded'); })
    .then(closeDb)
    .catch(async (error) => {
      console.error(error);
      await closeDb().catch(() => {});
      process.exit(1);
    });
}

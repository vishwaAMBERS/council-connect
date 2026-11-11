// Demo archive: the council of the previous academic year (2025-26), as if it had been
// archived when 2026-27 began. Runs only on the demo database and only when the archive is empty.
// These are records of people who are not users of the platform, so user_id stays NULL.
import { query } from './index.js';
import { POSITION_TITLES } from '../lib/positions.js';

const YEAR = '2025-26';
const TERM = ['2025-07-01', '2026-06-30'];

// [name, council ('MAIN' or unit code), position, verified, events, requests handled, grievances resolved]
const PAST_MEMBERS = [
  ['Aniket Deshpande', 'MAIN', 'president', true, 6, 41, 3],
  ['Rutuja Pawar', 'MAIN', 'ladies_representative', true, 2, 27, 5],
  ['Harsh Vyas', 'MAIN', 'anti_ragging_representative', true, 1, 9, 0],
  ['Sanjana Kale', 'IT', 'general_secretary', true, 5, 38, 7],
  ['Mihir Joshi', 'IT', 'technical_secretary', true, 4, 12, 1],
  ['Tanvi Shinde', 'IT', 'cultural_secretary', true, 3, 8, 0],
  ['Omkar Jagtap', 'IT', 'class_representative', false, 0, 15, 4],
  ['Nikhil Bhosale', 'CSE', 'general_secretary', true, 4, 33, 6],
  ['Pallavi Rane', 'CSE', 'technical_secretary', true, 3, 10, 2],
  ['Saurabh Gite', 'MECH', 'general_secretary', true, 2, 21, 9],
  ['Komal Wagh', 'ENTC', 'general_secretary', true, 3, 19, 2],
  ['Rahul Sonawane', 'CIVIL', 'general_secretary', true, 1, 14, 3]
];

export async function seedArchive({ log = console.log } = {}) {
  if ((await query('SELECT 1 FROM council_archive LIMIT 1')).rows.length) return false;
  const hod = (await query(`SELECT id, full_name, institution_id FROM users WHERE email = 'hod@geca.ac.in'`)).rows[0];
  if (!hod) return false; // not the demo database

  const units = Object.fromEntries((await query('SELECT code, name FROM academic_units')).rows.map((u) => [u.code, u.name]));
  for (const [name, council, position, verified, events, requests, grievances] of PAST_MEMBERS) {
    const main = council === 'MAIN';
    const isTopLevel = main || position === 'general_secretary';
    // Branch representatives were verified by that year's General Secretary of the same branch.
    const gs = PAST_MEMBERS.find((m) => m[1] === council && m[2] === 'general_secretary');
    await query(
      `INSERT INTO council_archive (
         institution_id, full_name, position, position_title, council_name, council_type, unit_code, unit_name,
         term_start, term_end, academic_year, was_verified, verified_by_name, verified_at,
         events_count, requests_handled, grievances_resolved, archived_by, archived_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, '2026-07-01T09:00:00Z')`,
      [
        hod.institution_id, name, position, POSITION_TITLES[position],
        main ? 'Main Student Council' : `${council} Departmental Council`, main ? 'main' : 'departmental',
        main ? null : council, main ? null : units[council],
        TERM[0], TERM[1], YEAR, verified,
        verified ? (isTopLevel ? hod.full_name : gs[0]) : null, verified ? '2025-07-18T10:00:00Z' : null,
        events, requests, grievances, hod.id
      ]
    );
  }
  log(`seeded archive demo data (${PAST_MEMBERS.length} council members of ${YEAR})`);
  return true;
}

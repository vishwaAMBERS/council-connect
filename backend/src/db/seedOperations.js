// Demo data for the campus-operations modules. Runs only when there are no campus locations yet
// and the demo accounts from seed.js exist, so it never touches real data.
import { query } from './index.js';

// NOTE: coordinates are approximate placements around the GECA campus centre, good enough for
// the demo map. Replace them with surveyed positions before a real deployment.
const LOCATIONS = [
  ['Main Building / Administrative Office', 'office', 'Principal, registrar and accounts.', 19.8762, 75.3433],
  ['Examination Section', 'office', 'Exam forms, hall tickets and results.', 19.8765, 75.3428],
  ['Training and Placement Office', 'office', 'Placement drives and internships.', 19.8759, 75.3440],
  ['CSE and IT Department', 'department', 'Computer Science and Information Technology; HOD offices on the first floor.', 19.8749, 75.3451],
  ['Mechanical Department and Workshop', 'department', 'Mechanical Engineering labs and workshop.', 19.8728, 75.3448],
  ['Electrical Department', 'department', 'Electrical Engineering.', 19.8744, 75.3440],
  ['ENTC Department', 'department', 'Electronics and Telecommunication Engineering.', 19.8752, 75.3460],
  ['Civil Department', 'department', 'Civil Engineering.', 19.8738, 75.3455],
  ['Boys Hostel A', 'hostel', 'Blocks A1 to A3.', 19.8731, 75.3420],
  ['Boys Hostel C', 'hostel', 'Blocks C1 and C2.', 19.8735, 75.3425],
  ['Girls Hostel', 'hostel', 'Girls hostel and warden office.', 19.8771, 75.3452],
  ['Main Auditorium', 'venue', 'Seats about 600.', 19.8756, 75.3418],
  ['Open Air Theatre', 'venue', 'Cultural programmes and gatherings.', 19.8770, 75.3440],
  ['Seminar Hall', 'venue', 'Workshops and guest lectures.', 19.8754, 75.3445],
  ['Central Library', 'facility', 'Reading hall and book bank.', 19.8758, 75.3436],
  ['Canteen', 'facility', 'Student canteen.', 19.8746, 75.3432],
  ['Sports Ground', 'facility', 'Cricket and football ground.', 19.8722, 75.3432]
];

const one = async (text, params) => (await query(text, params)).rows[0];

export async function seedOperations({ log = console.log } = {}) {
  if (await one('SELECT 1 AS x FROM campus_locations LIMIT 1')) return false;

  const users = {};
  for (const row of (await query(`SELECT id, email, academic_unit_id FROM users WHERE email LIKE '%@geca.ac.in'`)).rows) {
    users[row.email.split('@')[0]] = row;
  }
  const needed = ['hod', 'student', 'student2', 'student3', 'it_gs', 'it_cultural', 'president', 'it_cr3'];
  if (needed.some((name) => !users[name])) return false; // not the demo database

  const inst = await one(`SELECT id FROM institutions WHERE code = 'GECA'`);
  const place = {};
  for (const [name, type, description, lat, lng] of LOCATIONS) {
    place[name] = (await one(
      'INSERT INTO campus_locations (institution_id, name, type, description, lat, lng) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [inst.id, name, type, description, lat, lng]
    )).id;
  }

  // Events
  const addEvent = async (by, title, description, placeName, days, scope, capacity) => (await one(
    `INSERT INTO events (created_by, academic_unit_id, title, description, venue, location_id, starts_at, branch_scope, capacity)
     VALUES ($1, $2, $3, $4, $5, $6, date_trunc('hour', now()) + make_interval(days => $7, hours => 3), $8, $9) RETURNING id`,
    [users[by].id, users[by].academic_unit_id, title, description, placeName, place[placeName], days, scope, capacity]
  )).id;
  const hackathon = await addEvent('it_gs', 'CodeGECA Hackathon',
    '24-hour coding hackathon open to every branch. Teams of up to four. Problem statements are released at the opening session.',
    'CSE and IT Department', 9, 'all_branches', 120);
  await addEvent('president', 'Annual Cultural Night',
    'Music, dance and drama performances by students from all departments, followed by food stalls.',
    'Open Air Theatre', 20, 'all_branches', null);
  await addEvent('it_cultural', 'IT Freshers Welcome',
    'Welcome evening for first-year IT students, organised by the IT departmental council.',
    'Seminar Hall', 5, 'own_branch', 80);
  const pastEvent = (await one(
    `INSERT INTO events (created_by, academic_unit_id, title, description, venue, location_id, starts_at, branch_scope, capacity)
     VALUES ($1, $2, 'Resume and Aptitude Workshop', 'Hands-on session before the campus placement season.', 'Seminar Hall', $3, now() - interval '12 days', 'all_branches', 60)
     RETURNING id`,
    [users.it_gs.id, users.it_gs.academic_unit_id, place['Seminar Hall']]
  )).id;
  await query('INSERT INTO event_registrations (event_id, student_id) VALUES ($1, $2), ($1, $3)', [hackathon, users.student2.id, users.student3.id]);
  await query('INSERT INTO event_registrations (event_id, student_id, attended) VALUES ($1, $2, TRUE), ($1, $3, FALSE)', [pastEvent, users.student2.id, users.student3.id]);

  // Grievances: one being worked on, one resolved, one already escalated.
  const inProgress = (await one(
    `INSERT INTO grievances (raised_by, title, description, room_number, category, priority, ai_source, status, assigned_to, created_at, escalation_due_at)
     VALUES ($1, 'Wi-Fi keeps dropping in Block A', 'The Wi-Fi on the second floor disconnects every few minutes since Monday evening.', 'A-204',
             'wifi', 'medium', 'rules', 'in_progress', $2, now() - interval '20 hours', now() + interval '28 hours') RETURNING id`,
    [users.student2.id, users.it_cr3.id]
  )).id;
  await query(
    `INSERT INTO grievance_history (grievance_id, actor_id, status, note, created_at) VALUES
       ($1, $2, 'submitted', NULL, now() - interval '20 hours'),
       ($1, $3, 'assigned', 'Assigned to Neha Joshi', now() - interval '18 hours'),
       ($1, $3, 'in_progress', 'Reported to the network team; they will check the access point today.', now() - interval '17 hours')`,
    [inProgress, users.student2.id, users.it_cr3.id]
  );
  const resolved = (await one(
    `INSERT INTO grievances (raised_by, title, description, room_number, category, priority, ai_source, status, assigned_to, resolution_note, created_at, resolved_at, escalation_due_at)
     VALUES ($1, 'Tube light not working', 'The tube light above the study table is not working.', 'C-112',
             'electrical', 'low', 'rules', 'resolved', $2, 'Electrician replaced the tube light and starter.', now() - interval '6 days', now() - interval '5 days', now() - interval '3 days') RETURNING id`,
    [users.student3.id, users.it_gs.id]
  )).id;
  await query(
    `INSERT INTO grievance_history (grievance_id, actor_id, status, note, created_at) VALUES
       ($1, $2, 'submitted', NULL, now() - interval '6 days'),
       ($1, $3, 'assigned', 'Assigned to Rohan Patil', now() - interval '138 hours'),
       ($1, $3, 'resolved', 'Electrician replaced the tube light and starter.', now() - interval '5 days')`,
    [resolved, users.student3.id, users.it_gs.id]
  );
  const escalated = (await one(
    `INSERT INTO grievances (raised_by, title, description, room_number, category, priority, ai_source, status, created_at, escalation_due_at, escalated_at)
     VALUES ($1, 'No water supply on the third floor', 'There has been no water on the entire third floor since yesterday morning.', 'C-3rd floor',
             'water', 'high', 'rules', 'escalated', now() - interval '30 hours', now() - interval '6 hours', now() - interval '6 hours') RETURNING id`,
    [users.student3.id]
  )).id;
  await query(
    `INSERT INTO grievance_history (grievance_id, actor_id, status, note, created_at) VALUES
       ($1, $2, 'submitted', NULL, now() - interval '30 hours'),
       ($1, NULL, 'escalated', 'Not resolved within the response window. Escalated automatically to the HOD.', now() - interval '6 hours')`,
    [escalated, users.student3.id]
  );

  // Lost and found: open reports waiting for a counterpart.
  await query(
    `INSERT INTO lost_found_items (posted_by, type, title, description, location, location_id, occurred_on, created_at) VALUES
       ($1, 'found', 'Blue steel water bottle', 'Blue steel water bottle with a GECA sticker, found on a table.', 'Canteen', $4, current_date - 1, now() - interval '20 hours'),
       ($2, 'lost', 'Casio fx-991 calculator', 'Grey scientific calculator with my initials FS scratched on the back cover.', 'Mechanical Department and Workshop', $5, current_date - 2, now() - interval '2 days'),
       ($3, 'found', 'Black leather wallet', 'Black wallet with a college ID card inside, found near the entrance.', 'Main Auditorium', $6, current_date - 1, now() - interval '1 day')`,
    [users.student2.id, users.student3.id, users.it_cr3.id, place.Canteen, place['Mechanical Department and Workshop'], place['Main Auditorium']]
  );

  log(`seeded campus operations demo data (${LOCATIONS.length} locations, 4 events, 3 grievances, 3 lost/found reports)`);
  return true;
}

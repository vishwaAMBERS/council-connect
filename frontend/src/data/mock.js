export const branches = ['Computer Science', 'Information Technology', 'Electronics & Telecom', 'Electrical', 'Mechanical', 'Civil', 'Chemical', 'Instrumentation'];

export const departmentCodes = {
  'Information Technology': 'it',
  'Computer Science': 'cse',
  'Electronics & Telecom': 'entc',
  'Electrical': 'ee',
  'Mechanical': 'mech',
  'Civil': 'civil',
};

export const institutionPositions = ['Principal', 'Hostel Rector'];

export const positionSlugs = {
  'General Secretary': 'gs',
  'Vice General Secretary': 'vgs',
  'Branch Secretary': 'bs',
  'Class Representative': 'cr',
  'President': 'president',
  'Anti-Ragging Representative': 'anti_ragging',
  'HOD / Faculty Admin': 'hod',
  'Hostel Rector': 'rector',
  'Principal': 'principal',
};

export function roleEmail(branch, position) {
  if (institutionPositions.includes(position)) return `${positionSlugs[position]}@geca.ac.in`;
  const dept = departmentCodes[branch];
  const slug = positionSlugs[position];
  if (!dept || !slug) return null;
  return `${dept}_${slug}@geca.ac.in`;
}

export const studentEmail = (roll) => `${roll.replace(/\s+/g, '').toLowerCase()}@geca.ac.in`;

export const positions = Object.keys(positionSlugs);

export const councilMembers = [
  { id: 'c1', name: 'Rohit Sharma', position: 'General Secretary', branch: 'Computer Science', year: 4, verified: true, verifiedBy: 'HOD / Faculty Admin', term: '2025-26', about: 'Leading the student council and coordinating all branches.', email: roleEmail('Computer Science', 'General Secretary'), tags: ['governance', 'coordinator'] },
  { id: 'c2', name: 'Priya Nair', position: 'Branch Secretary', branch: 'Electrical', year: 3, verified: true, verifiedBy: 'Rohit Sharma (GS)', term: '2025-26', about: 'Electrical branch representative, event & grievance handling.', email: roleEmail('Electrical', 'Branch Secretary'), tags: ['electrical', 'events'] },
  { id: 'c3', name: 'Sneha Patil', position: 'Vice General Secretary', branch: 'Information Technology', year: 4, verified: true, verifiedBy: 'HOD / Faculty Admin', term: '2025-26', about: 'Assisting GS with communication and escalation workflows.', email: roleEmail('Information Technology', 'Vice General Secretary'), tags: ['it', 'comms'] },
  { id: 'c4', name: 'Aman Gupta', position: 'Class Representative', branch: 'Mechanical', year: 2, verified: false, verifiedBy: null, term: '2025-26', about: 'Pending verification by branch secretary.', email: roleEmail('Mechanical', 'Class Representative'), tags: ['mechanical'] },
  { id: 'c5', name: 'Kavita Jain', position: 'President', branch: 'Civil', year: 4, verified: true, verifiedBy: 'HOD / Faculty Admin', term: '2025-26', about: 'Civil branch student president, hostel liaison.', email: roleEmail('Civil', 'President'), tags: ['civil', 'hostel'] },
  { id: 'c6', name: 'Rahul Verma', position: 'Anti-Ragging Representative', branch: 'Electronics & Telecom', year: 3, verified: true, verifiedBy: 'Rohit Sharma (GS)', term: '2025-26', about: 'Handles anti-ragging complaints and student safety.', email: roleEmail('Electronics & Telecom', 'Anti-Ragging Representative'), tags: ['safety'] },
  { id: 'c7', name: 'Dr. A. V. Kulkarni', position: 'HOD / Faculty Admin', branch: 'Computer Science', year: null, verified: true, verifiedBy: 'Institution', term: '2025-26', about: 'Head of Computer Science department. Verifies General Secretaries and enforces hierarchy rules.', email: roleEmail('Computer Science', 'HOD / Faculty Admin'), tags: ['admin', 'hod'] },
  { id: 'c8', name: 'Dr. R. S. Patil', position: 'Hostel Rector', branch: null, year: null, verified: true, verifiedBy: 'Institution', term: 'Appointed', about: 'Oversees hostel administration, discipline and hostel-level grievance resolution.', email: roleEmail(null, 'Hostel Rector'), tags: ['hostel', 'admin'] },
  { id: 'c9', name: 'Dr. V. R. Kulkarni', position: 'Principal', branch: null, year: null, verified: true, verifiedBy: 'Institution', term: 'Appointed', about: 'Principal of GECA. Sanctions college-wide events and approves major escalations.', email: roleEmail(null, 'Principal'), tags: ['governance', 'admin'] },
];

export const contactRequests = [
  { id: 'r1', from: 'Aditya Adhave', to: 'Rohit Sharma', category: 'Academic', message: 'Sir, can you help me with the placement cell registration process?', status: 'pending', aiNote: 'AI: Academic-related, routed to GS', createdAt: '2h ago' },
  { id: 'r2', from: 'Neha Kulkarni', to: 'Priya Nair', category: 'Event', message: 'Want to volunteer for the upcoming tech fest organising team.', status: 'approved', createdAt: '1d ago' },
  { id: 'r3', from: 'Sarthak Bansal', to: 'Rahul Verma', category: 'Urgent', message: 'Need to report a safety concern in hostel Block C.', status: 'escalated', aiNote: 'AI: Urgent — flagged for escalation', createdAt: '3h ago' },
];

export const messages = [
  { id: 'm1', thread: 'r2', with: 'Neha Kulkarni', last: 'Yes, please share your roll number.', time: '1h ago', unread: 1 },
  { id: 'm2', thread: 'r1', with: 'Aditya Adhave', last: 'Thank you sir!', time: '2h ago', unread: 0 },
];

export const events = [
  { id: 'e1', title: 'Tech Fest 2026', tag: 'Annual Fest', date: '2026-02-14', venue: 'Main Auditorium', organizer: 'Rohit Sharma', poster: null, registrations: 240, capacity: 400, registered: false, saved: true, desc: 'Biggest technical festival of GECA with competitions, workshops and celebrity night.' },
  { id: 'e2', title: 'Placement Drive Prep', tag: 'Workshop', date: '2026-01-28', venue: 'Seminar Hall 2', organizer: 'Priya Nair', poster: null, registrations: 120, capacity: 150, registered: true, saved: false, desc: 'Mock aptitude + GD round practice session before the campus drive.' },
  { id: 'e3', title: 'Hackathon: CodeGECA', tag: 'Competition', date: '2026-02-05', venue: 'CS Dept Lab 3', organizer: 'Sneha Patil', poster: null, registrations: 60, capacity: 100, registered: false, saved: true, desc: '24-hour coding hackathon with ₹50k prize pool and industry judges.' },
  { id: 'e4', title: 'Cultural Night', tag: 'Cultural', date: '2026-03-01', venue: 'Open Air Theatre', organizer: 'Kavita Jain', poster: null, registrations: 500, capacity: 800, registered: false, saved: false, desc: 'Annual cultural night with music, dance and food stalls.' },
];

export const grievances = [
  { id: 'g1', title: 'Water leakage in room 214', category: 'Water Leakage', priority: 'high', status: 'in_progress', submittedAt: '2d ago', room: 'Hostel C-214', assignedTo: 'Warden Office', desc: 'Leakage from ceiling above the study desk, water damage to books.', timeline: [
    { title: 'Submitted', sub: '2 days ago', done: true },
    { title: 'AI Categorized · Water Leakage · High Priority', sub: 'Auto-routed to Warden Office', done: true },
    { title: 'In progress — plumber assigned', sub: 'Assigned to Mr. Patil (maintenance)', done: true },
    { title: 'Resolution pending', sub: 'Will be updated by warden', done: false },
  ] },
  { id: 'g2', title: 'WiFi not working in block A', category: 'WiFi Problems', priority: 'medium', status: 'open', submittedAt: '5h ago', room: 'Hostel A-101', assignedTo: 'IT Helpdesk', desc: 'WiFi dropping every 5 minutes since morning.', timeline: [
    { title: 'Submitted', sub: '5 hours ago', done: true },
    { title: 'AI Categorized · WiFi Problems', sub: 'Routed to IT Helpdesk', done: true },
    { title: 'Awaiting acknowledgement', sub: '', done: false },
  ] },
  { id: 'g3', title: 'Mess food quality complaint', category: 'Mess Complaints', priority: 'urgent', status: 'escalated', submittedAt: '1d ago', room: 'Mess', assignedTo: 'Mess Committee', desc: 'Repeated quality issues with dinner menu.', timeline: [
    { title: 'Submitted', sub: '1 day ago', done: true },
    { title: 'AI Categorized · Mess Complaints · Urgent', sub: 'Routed to Mess Committee', done: true },
    { title: 'No response in 24h → auto-escalated to Admin', sub: 'Escalated to HOD', done: true },
    { title: 'Under review', sub: '', done: false },
  ] },
];

export const lostFoundItems = [
  { id: 'l1', type: 'lost', title: 'Blue water bottle', desc: 'Steel blue bottle with "GECA 2024" sticker, left in CS canteen.', location: 'CS Dept Canteen', img: null, matched: false },
  { id: 'l2', type: 'found', title: 'Black wallet', desc: 'Black wallet found near Main Auditorium, contains ID card.', location: 'Main Auditorium', img: null, matched: true },
  { id: 'l3', type: 'lost', title: 'Calculator (Casio fx-991)', desc: 'Scientific calculator, grey, lost in Mechanical workshop.', location: 'Mechanical Workshop', img: null, matched: false },
  { id: 'l4', type: 'found', title: 'Blue water bottle', desc: 'Blue steel bottle found in CS canteen today.', location: 'CS Dept Canteen', img: null, matched: true },
];

export const mapPins = [
  { id: 'p1', name: 'Main Building / Admin', type: 'office', lat: 19.8762, lng: 75.3433 },
  { id: 'p2', name: 'CS & IT Department', type: 'department', lat: 19.8749, lng: 75.3451 },
  { id: 'p3', name: 'Hostel C', type: 'hostel', lat: 19.8735, lng: 75.3425 },
  { id: 'p4', name: 'Main Auditorium', type: 'venue', lat: 19.8756, lng: 75.3418 },
  { id: 'p5', name: 'Open Air Theatre', type: 'venue', lat: 19.8770, lng: 75.3440 },
  { id: 'p6', name: 'Mechanical Workshop', type: 'department', lat: 19.8728, lng: 75.3448 },
];

export const analytics = {
  governance: [
    { label: 'Active Representatives', value: '42' },
    { label: 'Verified', value: '38' },
    { label: 'Pending Verification', value: '4' },
    { label: 'Communication Threads', value: '186' },
  ],
  events: [
    { label: 'Total Events', value: '24' },
    { label: 'Total Registrations', value: '1,240' },
    { label: 'Avg Attendance', value: '78%' },
    { label: 'Engagement Score', value: '8.4' },
  ],
  complaints: [
    { label: 'Open Complaints', value: '12' },
    { label: 'Avg Resolution Time', value: '2.3 days' },
    { label: 'Escalated', value: '3' },
    { label: 'Resolved (30d)', value: '45' },
  ],
};

export const complaintCategories = [
  'Electrical issues',
  'Water leakage',
  'WiFi problems',
  'Mess complaints',
  'Infrastructure issues',
];

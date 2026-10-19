const seedUsers = [
  { id: 'u1', email: 'student@geca.ac.in', password: 'student', name: 'Aditya Adhave', role: 'student', branch: 'Information Technology', year: 4, roll: 'IT22134', verified: true, profilePic: null },
  { id: 'u2', email: 'cse_gs@geca.ac.in', password: 'gs', name: 'Rohit Sharma', role: 'rep', branch: 'Computer Science', year: 4, position: 'General Secretary', verified: true, roleEmail: 'cse_gs@geca.ac.in', profilePic: null },
  { id: 'u3', email: 'ee_bs@geca.ac.in', password: 'rep', name: 'Priya Nair', role: 'rep', branch: 'Electrical', year: 3, position: 'Branch Secretary', verified: true, roleEmail: 'ee_bs@geca.ac.in', profilePic: null },
  { id: 'u4', email: 'cse_hod@geca.ac.in', password: 'admin', name: 'Dr. A. V. Kulkarni', role: 'admin', branch: 'Computer Science', position: 'HOD / Faculty Admin', verified: true, roleEmail: 'cse_hod@geca.ac.in', profilePic: null },
  { id: 'u5', email: 'rector@geca.ac.in', password: 'rector', name: 'Dr. R. S. Patil', role: 'admin', branch: null, position: 'Hostel Rector', verified: true, roleEmail: 'rector@geca.ac.in', profilePic: null },
  { id: 'u6', email: 'principal@geca.ac.in', password: 'principal', name: 'Dr. V. R. Kulkarni', role: 'admin', branch: null, position: 'Principal', verified: true, roleEmail: 'principal@geca.ac.in', profilePic: null },
];

const KEY = 'cc_users';
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return seedUsers.map((u) => ({ ...u }));
}

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(users));
  } catch {}
}

let users = load();

export const getUsers = () => users;
export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const safeUser = (u) => {
  const { password, ...rest } = u;
  return rest;
};
export { safeUser };

export function authenticate(email, password) {
  const u = users.find((x) => x.email === email && x.password === password);
  return u ? safeUser(u) : null;
}

export function updateProfile(id, patch) {
  users = users.map((u) => (u.id === id ? { ...u, ...patch } : u));
  persist();
  notify();
  return safeUser(users.find((u) => u.id === id));
}

const roleForPosition = (position) =>
  ['HOD / Faculty Admin', 'Hostel Rector', 'Principal'].includes(position) ? 'admin' : 'rep';

export function handoverPosition(position, toUserId) {
  if (!position || !toUserId) return null;
  const oldHolder = users.find((u) => u.position === position && u.role !== 'student');
  const target = users.find((u) => u.id === toUserId);
  if (!target || target.id === oldHolder?.id) return null;
  if (target.role !== 'student') return null;

  const permanentEmail = oldHolder?.roleEmail || `${positionSlug(position)}@geca.ac.in`;

  users = users.map((u) => {
    if (u.id === oldHolder?.id) return { ...u, role: 'student', position: null, roleEmail: null, verified: false };
    if (u.id === toUserId) return { ...u, position, roleEmail: permanentEmail, role: roleForPosition(position), verified: true };
    return u;
  });
  persist();
  notify();
  return { old: oldHolder ? safeUser(oldHolder) : null, next: safeUser(target) };
}

function positionSlug(position) {
  const map = {
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
  return map[position] || position.toLowerCase().replace(/\s+/g, '_');
}

export function resetUsers() {
  users = seedUsers.map((u) => ({ ...u }));
  try { localStorage.removeItem(KEY); } catch {}
  notify();
}

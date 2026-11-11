// Display helpers. Kept in step with web/src/lib/format.js.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-07-01" -> "Jul 2026" (date-only strings are not shifted by time zone). */
export function monthYear(isoDate) {
  if (!isoDate) return '';
  const [year, month] = isoDate.split('-');
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

export const formatTerm = (start, end) => (start && end ? `${monthYear(start)} – ${monthYear(end)}` : 'Term not set');

const pad = (n) => String(n).padStart(2, '0');

export function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// Built by hand rather than with toLocaleString, which is not consistent across phone JS engines.
export function formatDateTime(value) {
  if (!value) return '';
  const d = new Date(value);
  const hour = d.getHours() % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${hour}:${pad(d.getMinutes())} ${d.getHours() < 12 ? 'am' : 'pm'}`;
}

export function timeAgo(value) {
  if (!value) return '';
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days}d ago` : formatDate(value);
}

export const initials = (name = '') =>
  name
    .replace(/^(Dr|Prof|Mr|Ms|Mrs)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

export const titleCase = (value = '') => value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const ROLE_LABEL = { student: 'Student', representative: 'Representative', admin: 'Admin / HOD' };

export const REQUEST_CATEGORY = {
  academic: { label: 'Academic', tone: 'blue' },
  personal: { label: 'Personal', tone: 'gray' },
  event: { label: 'Event', tone: 'green' },
  urgent: { label: 'Urgent', tone: 'red' },
};

export const GRIEVANCE_CATEGORY = { electrical: 'Electrical', water: 'Water', wifi: 'Wi-Fi', mess: 'Mess', infrastructure: 'Infrastructure' };

export const STATUS_TONE = {
  pending: 'gold', approved: 'green', declined: 'red',
  submitted: 'blue', assigned: 'blue', in_progress: 'gold', resolved: 'green', escalated: 'red',
  open: 'blue', matched: 'green',
  low: 'green', medium: 'gold', high: 'red', critical: 'red',
};

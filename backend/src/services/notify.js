// In-app notifications. Sending one must never break the action that triggered it.
import { query } from '../db/index.js';

const clip = (value, max) => (value && value.length > max ? `${value.slice(0, max - 1)}…` : value || null);

/** Notify one user. `link` is a web path such as /grievances/<id>. */
export async function notify(userId, { type, title, body = null, link = null }) {
  try {
    await query(
      'INSERT INTO notifications (user_id, type, title, body, link) VALUES ($1, $2, $3, $4, $5)',
      [userId, type, clip(title, 150), clip(body, 300), link]
    );
  } catch (error) {
    console.warn(`notify: could not notify ${userId}: ${error.message}`);
  }
}

/** Notify every active admin (HOD level). */
export async function notifyAdmins(notification) {
  const admins = (await query(`SELECT id FROM users WHERE role = 'admin' AND is_active`)).rows;
  await Promise.all(admins.map((admin) => notify(admin.id, notification)));
}

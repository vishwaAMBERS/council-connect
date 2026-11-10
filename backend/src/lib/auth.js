import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { query } from '../db/index.js';
import { HttpError, h } from './http.js';

export function signToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d' });
}

const USER_SELECT = `
  SELECT u.id, u.full_name, u.email, u.role, u.year, u.about, u.avatar_url, u.is_active,
         u.institution_id, u.academic_unit_id, au.code AS unit_code, au.name AS unit_name
  FROM users u
  LEFT JOIN academic_units au ON au.id = u.academic_unit_id`;

export async function findUserById(id) {
  return (await query(`${USER_SELECT} WHERE u.id = $1`, [id])).rows[0] || null;
}

export async function findUserByEmail(email) {
  return (await query(`${USER_SELECT} WHERE lower(u.email) = lower($1)`, [email])).rows[0] || null;
}

/** Shape of a user as sent to clients. Never includes the password hash. */
export function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    year: row.year,
    about: row.about,
    avatarUrl: row.avatar_url,
    unit: row.unit_code ? { code: row.unit_code, name: row.unit_name } : null
  };
}

/** Requires a valid token for an active account. Sets req.user to the database row. */
export const requireAuth = h(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) throw new HttpError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, 'Invalid or expired session');
  }

  const user = await findUserById(payload.sub);
  if (!user || !user.is_active) throw new HttpError(401, 'Invalid or expired session');
  req.user = user;
  next();
});

export const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return next(new HttpError(403, 'You do not have permission to do this'));
  return next();
};

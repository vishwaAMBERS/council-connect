import { authenticate, getUsers, safeUser } from '../data/usersStore.js';

const MOCK_DELAY = 250;

function simulate(resp) {
  return new Promise((resolve) => setTimeout(() => resolve(resp), MOCK_DELAY));
}

export const mockApi = {
  async post(path, payload = {}) {
    if (path === '/auth/login') {
      return simulate(authenticate(payload.email, payload.password) || { error: 'Invalid email or password' });
    }
    if (path === '/auth/register') {
      return simulate({ ...payload, id: 'u-new', verified: false });
    }
    return simulate({ ok: true });
  },
  async get(path) {
    if (path === '/auth/me') {
      const first = getUsers()[0];
      return simulate(first ? safeUser(first) : { ok: true });
    }
    return simulate({ ok: true });
  },
};

export const api = mockApi;

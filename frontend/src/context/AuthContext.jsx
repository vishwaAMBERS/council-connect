import React, { createContext, useContext, useState, useCallback, useSyncExternalStore } from 'react';
import { api } from '../api/client.js';
import { getUsers, subscribe as subscribeUsers } from '../data/usersStore.js';

const AuthContext = createContext(null);

export const ROLES = ['student', 'rep', 'admin'];

export function AuthProvider({ children }) {
  const [userId, setUserId] = useState(() => {
    try {
      const raw = localStorage.getItem('cc_user');
      return raw ? (JSON.parse(raw).id || null) : null;
    } catch {
      return null;
    }
  });

  // The live user object always comes from the store, so profile edits and
  // position handovers that affect the logged-in account reflect immediately.
  const user = useSyncExternalStore(
    subscribeUsers,
    () => getUsers().find((u) => u.id === userId) || null,
    () => null
  );

  const persist = useCallback((u) => {
    localStorage.setItem('cc_user', JSON.stringify(u));
    setUserId(u.id);
  }, []);

  const login = useCallback(async (email, password) => {
    const u = await api.post('/auth/login', { email, password });
    if (!u.error) persist(u);
    return u;
  }, [persist]);

  const register = useCallback(async (payload) => {
    const u = await api.post('/auth/register', payload);
    if (!u.error) persist(u);
    return u;
  }, [persist]);

  const logout = useCallback(() => {
    localStorage.removeItem('cc_user');
    setUserId(null);
  }, []);

  const value = { user, login, register, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

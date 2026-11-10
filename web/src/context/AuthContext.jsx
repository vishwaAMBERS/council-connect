import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getToken, setToken, SESSION_EXPIRED_EVENT } from '../api/client.js';

const AuthContext = createContext(null);

export const ROLES = ['student', 'representative', 'admin'];

/** Where each role lands after signing in. */
export const homePathFor = (user) =>
  user?.role === 'admin' ? '/admin' : user?.role === 'representative' ? '/messages' : '/council';

// `name` and `branch` are kept as aliases for pages that still run on demo data.
const normalize = (user) => (user ? { ...user, name: user.fullName, branch: user.unit?.name || null } : null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  // Restore the session from the stored token.
  useEffect(() => {
    if (!getToken()) return undefined;
    let cancelled = false;
    api
      .get('/auth/me')
      .then((data) => !cancelled && setUser(normalize(data.user)))
      .catch((error) => {
        // Keep the token on network errors so a backend restart does not sign everyone out.
        if (error.status === 401) setToken(null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const startSession = useCallback((data) => {
    setToken(data.token);
    const next = normalize(data.user);
    setUser(next);
    return next;
  }, []);

  // Both throw ApiError (with a readable message) on failure.
  const login = useCallback(async (email, password) => startSession(await api.post('/auth/login', { email, password })), [startSession]);
  const register = useCallback(async (payload) => startSession(await api.post('/auth/register', payload)), [startSession]);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const data = await api.get('/auth/me');
    setUser(normalize(data.user));
  }, []);

  const value = { user, loading, login, register, logout, refreshUser };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

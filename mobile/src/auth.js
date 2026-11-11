import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, loadToken, saveToken, setSessionExpiredHandler } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the stored token when the app opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await loadToken();
      if (token) {
        try {
          const data = await api.get('/auth/me');
          if (!cancelled) setUser(data.user);
        } catch (error) {
          // Keep the token on network errors, so being offline does not sign the user out.
          if (error.status === 401) await saveToken(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => {
      saveToken(null);
      setUser(null);
    });
  }, []);

  const startSession = useCallback(async (data) => {
    await saveToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Both throw ApiError with a readable message on failure.
  const login = useCallback(async (email, password) => startSession(await api.post('/auth/login', { email, password })), [startSession]);
  const register = useCallback(async (payload) => startSession(await api.post('/auth/register', payload)), [startSession]);

  const logout = useCallback(async () => {
    await saveToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    setUser((await api.get('/auth/me')).user);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type User = { id: number; username?: string; email?: string } | null;

type AuthCtx = {
  user: User;
  isAuthenticated: boolean;
  login: (token: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);

  useEffect(() => {
    // On mount, try session cookie me endpoint
    (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (data?.authenticated) setUser(data.user);
      } catch {}
    })();
  }, []);

  const login = async (token: string) => {
    try {
      // Store token; for demo keep in localStorage
      localStorage.setItem('auth_token', token);
      // Optionally include token in future requests (e.g., as header) if backend expects it
      // For now, session cookie governs auth; token is for client state
      const { data } = await api.get('/auth/me');
      if (data?.authenticated) setUser(data.user);
      window.location.assign('/dashboard');
    } catch (e) {
      // fallback to dashboard anyway for now
      window.location.assign('/dashboard');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    localStorage.removeItem('auth_token');
    setUser(null);
    window.location.assign('/');
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

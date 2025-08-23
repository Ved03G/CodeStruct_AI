import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

type User = { id: number; username?: string; email?: string } | null;

type AuthCtx = {
  user: User;
  isAuthenticated: boolean;
  login: () => Promise<void>;
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
      } catch { }
    })();
  }, []);

  const login = async () => {
    try {
      // Get the API base URL and construct the login endpoint
      const apiBaseURL = import.meta.env.VITE_API_BASE_URL || '/api';
      const loginUrl = `${apiBaseURL}/auth/login`;

      // Simply redirect to the backend login endpoint
      // The backend will handle OAuth and set secure cookies
      window.location.assign(loginUrl);
    } catch (e) {
      console.error('Login failed:', e);
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch { }
    setUser(null);
    window.location.assign('/');
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, login, logout }),
    [user]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

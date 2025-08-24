import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize from storage or media query synchronously to avoid flash
  const getInitial = (): Theme => {
    const stored = (typeof window !== 'undefined') ? (localStorage.getItem('theme') as Theme | null) : null;
    if (stored === 'dark' || stored === 'light') return stored;
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  };
  const [theme, setThemeState] = useState<Theme>(getInitial);

  // initialize from localStorage or OS preference
  useEffect(() => {
    // On mount, ensure document class matches the initial state (covers SSR/first paint)
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
  }, []);

  // apply class to documentElement for Tailwind dark mode
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const value = useMemo(() => ({ theme, toggle, setTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

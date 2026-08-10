/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const readStoredTheme = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    return window.localStorage.getItem('dsts_theme') || 'dark';
  } catch {
    return 'dark';
  }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme());

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
    try {
      window.localStorage.setItem('dsts_theme', theme);
    } catch {
      // Ignore storage errors in restricted environments.
    }
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

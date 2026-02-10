'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';
type EffectiveTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'epitrello-theme';

function getSystemTheme(): EffectiveTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getEffectiveTheme(theme: Theme): EffectiveTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

function applyTheme(effectiveTheme: EffectiveTheme) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Initialize theme from localStorage immediately
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initialTheme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
    const effective = getEffectiveTheme(initialTheme);

    setThemeState(initialTheme);
    setEffectiveTheme(effective);
    applyTheme(effective);
    setMounted(true);

    // Fetch theme from API (non-blocking)
    fetch('/api/user/profile')
      .then(res => res.json())
      .then(data => {
        if (data.theme && ['light', 'dark', 'system'].includes(data.theme)) {
          const apiTheme = data.theme as Theme;
          // Only update if different from localStorage
          if (apiTheme !== initialTheme) {
            setThemeState(apiTheme);
            const newEffective = getEffectiveTheme(apiTheme);
            setEffectiveTheme(newEffective);
            applyTheme(newEffective);
            localStorage.setItem(STORAGE_KEY, apiTheme);
          }
        }
      })
      .catch(err => {
        // User might not be logged in, that's okay
        console.debug('Could not fetch theme preference:', err);
      });
  }, []);

  // Listen to system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = () => {
      if (theme === 'system') {
        const newEffective = getSystemTheme();
        setEffectiveTheme(newEffective);
        applyTheme(newEffective);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    const newEffective = getEffectiveTheme(newTheme);
    setEffectiveTheme(newEffective);
    applyTheme(newEffective);

    // Update localStorage immediately
    localStorage.setItem(STORAGE_KEY, newTheme);

    // Update database asynchronously
    fetch('/api/user/profile/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        theme: newTheme,
      }),
    }).catch(err => {
      console.error('Failed to save theme preference:', err);
    });
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, effectiveTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeName = 'amber' | 'purple' | 'rain';

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  themes: readonly ThemeName[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const THEME_STORAGE_KEY = 'serious-social-theme';
const DEFAULT_THEME: ThemeName = 'purple';
const THEMES: readonly ThemeName[] = ['amber', 'purple', 'rain'] as const;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(DEFAULT_THEME);
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeName | null;
    if (stored && THEMES.includes(stored)) {
      setThemeState(stored);
    }
    setMounted(true);
  }, []);

  // Apply theme class to <html> element
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    // Remove all theme classes
    THEMES.forEach((t) => root.classList.remove(`theme-${t}`));
    // Add current theme class
    root.classList.add(`theme-${theme}`);
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  };

  // Prevent flash of wrong theme by rendering children immediately
  // The theme class will be applied on first effect run
  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

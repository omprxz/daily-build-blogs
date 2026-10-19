import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api.js';

interface AppearanceConfig {
  accentColor: string;
  sidebarColor: string;
  surfaceColor: string;
  borderStyle: string;
  themeMode: string;
  density: string;
  sidebarCollapsed: boolean;
}

interface ThemeContextType {
  isDark: boolean;
  themeMode: string;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  appearance: AppearanceConfig;
  updateAppearance: (newSettings: Partial<AppearanceConfig>) => Promise<void>;
}

const defaultAppearance: AppearanceConfig = {
  accentColor: '#4F46E5',
  sidebarColor: '#0F172A',
  surfaceColor: '#FFFFFF',
  borderStyle: 'subtle',
  themeMode: 'system',
  density: 'comfortable',
  sidebarCollapsed: false,
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  themeMode: 'system',
  setThemeMode: () => {},
  toggleTheme: () => {},
  appearance: defaultAppearance,
  updateAppearance: async () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('dailybuild_theme_mode') || 'system';
    }
    return 'system';
  });

  const [isDark, setIsDark] = useState<boolean>(false);
  const [appearance, setAppearance] = useState<AppearanceConfig>(defaultAppearance);

  useEffect(() => {
    // Load persisted appearance from API if available
    api.getAppearance().then((data) => {
      if (data) setAppearance(data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const applyTheme = () => {
      let activeDark = false;
      if (themeMode === 'dark') {
        activeDark = true;
      } else if (themeMode === 'light') {
        activeDark = false;
      } else {
        activeDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDark(activeDark);
      if (activeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    if (themeMode === 'system' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [themeMode]);

  const setThemeMode = (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    localStorage.setItem('dailybuild_theme_mode', mode);
  };

  const toggleTheme = () => {
    const nextMode = isDark ? 'light' : 'dark';
    setThemeMode(nextMode);
  };

  const updateAppearance = async (newSettings: Partial<AppearanceConfig>) => {
    const updated = { ...appearance, ...newSettings };
    setAppearance(updated);
    try {
      await api.updateAppearance(newSettings);
    } catch (e) {
      console.warn('Could not sync appearance with server:', e);
    }
  };

  return (
    <ThemeContext.Provider value={{ isDark, themeMode, setThemeMode, toggleTheme, appearance, updateAppearance }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

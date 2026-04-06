import React, { createContext, useContext, useState, useCallback } from 'react';
import { THEMES, ThemeColors, ThemeKey } from './themes';
import { storage } from '../../lib/storage/mmkv';

const THEME_KEY = 'active-theme';

interface ThemeContextValue {
  themeKey: ThemeKey;
  theme: ThemeColors;
  setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeKey: 'default',
  theme: THEMES.default,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>(() => {
    const saved = storage.getString(THEME_KEY) as ThemeKey | undefined;
    return saved && THEMES[saved] ? saved : 'default';
  });

  const setTheme = useCallback((key: ThemeKey) => {
    storage.set(THEME_KEY, key);
    setThemeKey(key);
  }, []);

  return (
    <ThemeContext.Provider value={{ themeKey, theme: THEMES[themeKey], setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

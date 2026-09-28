import React, { createContext, useContext, useState, useCallback } from 'react';
import { THEMES, ThemeColors, ThemeKey } from './themes';
import { storage } from '../../lib/storage/mmkv';
import { applyThemeToColors, savedThemeKey, THEME_STORAGE_KEY } from './tokens';

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
  // tokens.ts already applied the saved theme when it was loaded.
  const [themeKey, setThemeKey] = useState<ThemeKey>(savedThemeKey);

  const setTheme = useCallback((key: ThemeKey) => {
    storage.set(THEME_STORAGE_KEY, key);
    applyThemeToColors(key);
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

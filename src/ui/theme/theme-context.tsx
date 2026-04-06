import React, { createContext, useContext, useState, useCallback } from 'react';
import { THEMES, ThemeColors, ThemeKey } from './themes';
import { storage } from '../../lib/storage/mmkv';
import { colors } from './tokens';

function applyThemeToColors(key: ThemeKey) {
  const t = THEMES[key];
  colors.background = t.background;
  colors.surface = t.surface;
  colors.border = t.border;
  colors.text = t.text;
  colors.textSecondary = t.textSecondary;
  colors.textMuted = t.textMuted;
  colors.primary = t.primary;
  colors.primaryDark = t.primaryDark;
  colors.accent = t.accent;
  colors.success = t.success;
  colors.streak = t.streak;
  colors.xp = t.xp;
  if (t.gold) colors.accent = t.gold;
}

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
    const key = saved && THEMES[saved] ? saved : 'default';
    applyThemeToColors(key);
    return key;
  });

  const setTheme = useCallback((key: ThemeKey) => {
    storage.set(THEME_KEY, key);
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

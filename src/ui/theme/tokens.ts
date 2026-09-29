import { THEMES, type ThemeKey } from './themes';
import { storage } from '../../lib/storage/mmkv';

export const colors: {
  background: string;
  surface: string;
  surfaceLight: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  streak: string;
  xp: string;
  border: string;
} = {
  background: '#1e2448',
  surface: '#262d5a',
  surfaceLight: '#2e3870',
  primary: '#e94560',
  primaryDark: '#c13350',
  secondary: '#6a44a0',
  accent: '#f5c518',
  text: '#f0f0ff',
  textSecondary: '#b8bcdc',
  textMuted: '#7880b0',
  success: '#4ecca3',
  warning: '#f5c518',
  danger: '#e94560',
  streak: '#ff6b35',
  xp: '#9b8cf5',
  border: '#3a4080',
};

export const THEME_STORAGE_KEY = 'active-theme';

/** Copies a theme palette into the shared `colors` object. */
export function applyThemeToColors(key: ThemeKey): void {
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
  if (t.surfaceLight) colors.surfaceLight = t.surfaceLight;
  if (t.secondary) colors.secondary = t.secondary;
  if (t.danger) colors.danger = t.danger;
  if (t.warning) colors.warning = t.warning;
}

export function savedThemeKey(): ThemeKey {
  const saved = storage.getString(THEME_STORAGE_KEY) as ThemeKey | undefined;
  return saved && THEMES[saved] ? saved : 'default';
}

// Apply the saved theme as soon as the palette is loaded: styles created once
// at module load (StyleSheet.create at top level) then start from the right theme.
applyThemeToColors(savedThemeKey());

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSizes = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
  title: 40,
} as const;

/**
 * Pixel font (Jersey 10) used for every bold text: titles, labels, numbers,
 * buttons. Body text stays on the system font for readability. Loaded in
 * app/_layout.tsx; set `fontFamily` instead of `fontWeight` (Android ignores
 * weights on custom fonts). Jersey 10 has a single weight.
 */
export const fonts = {
  bold: 'Jersey10_400Regular',
  semibold: 'Jersey10_400Regular',
} as const;

/**
 * Jersey 10 draws smaller than the system font at the same size: pixel-font
 * texts go through this so they keep the size of the text around them.
 */
export function pixelSize(size: number): number {
  return Math.round(size * 1.3);
}

/** Size of one "pixel" of the stepped frames (corners, borders, ledge). */
export const PIXEL = 3;

// Square by design: the pixel direction has no rounded corners. Emphasis
// comes from PixelFrame (stepped corners + ledge) instead.
export const borderRadius = {
  sm: 0,
  md: 0,
  lg: 0,
} as const;

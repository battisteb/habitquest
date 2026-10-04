import { THEMES, type ThemeKey } from './themes';
import { storage } from '../../lib/storage/mmkv';
import { STARTUP_FONT_SCRIPT } from '../../lib/i18n';

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
 * Pixel font used for every bold text: titles, labels, numbers, buttons.
 * Jersey 10, DotGothic16 when the app is in Japanese and Galmuri11 Bold in
 * Korean (Jersey has neither Japanese nor Korean characters). Body text stays on the system font for
 * readability. Loaded in app/_layout.tsx; set `fontFamily` instead of
 * `fontWeight` (Android ignores weights on custom fonts). Both fonts have a
 * single weight. Chosen at startup: switching to or from Japanese or Korean
 * restarts the app (setLang).
 */
const PIXEL_FONT = { latin: 'Jersey10_400Regular', ja: 'DotGothic16_400Regular', ko: 'Galmuri11Bold' }[STARTUP_FONT_SCRIPT];
export const fonts = {
  bold: PIXEL_FONT,
  semibold: PIXEL_FONT,
} as const;

/**
 * Jersey 10 draws smaller than the system font at the same size: pixel-font
 * texts go through this so they keep the size of the text around them.
 * DotGothic16 and Galmuri11 already have the system font's size.
 */
export function pixelSize(size: number): number {
  return STARTUP_FONT_SCRIPT === 'latin' ? Math.round(size * 1.3) : size;
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

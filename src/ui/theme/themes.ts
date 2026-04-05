import { colors as defaultColors } from './tokens';

export interface ThemeColors {
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
}

export const THEMES: Record<string, ThemeColors> = {
  default: { ...defaultColors },
  theme_ocean: {
    ...defaultColors,
    background: '#0a1628',
    surface: '#0d2137',
    surfaceLight: '#134066',
    primary: '#0ea5e9',
    primaryDark: '#0284c7',
    secondary: '#06b6d4',
    accent: '#38bdf8',
    border: '#1e3a5f',
  },
  theme_forest: {
    ...defaultColors,
    background: '#0f1a0f',
    surface: '#1a2e1a',
    surfaceLight: '#2d4a2d',
    primary: '#22c55e',
    primaryDark: '#16a34a',
    secondary: '#15803d',
    accent: '#a3e635',
    border: '#2a4a2a',
  },
  theme_sunset: {
    ...defaultColors,
    background: '#1a0f0a',
    surface: '#2e1a0d',
    surfaceLight: '#4a2d15',
    primary: '#f97316',
    primaryDark: '#ea580c',
    secondary: '#dc2626',
    accent: '#fbbf24',
    border: '#4a2a1a',
  },
  theme_neon: {
    ...defaultColors,
    background: '#0a0a0f',
    surface: '#12121f',
    surfaceLight: '#1a1a2f',
    primary: '#e040fb',
    primaryDark: '#c026d3',
    secondary: '#00e5ff',
    accent: '#76ff03',
    border: '#2a2a4f',
    text: '#f0f0ff',
  },
  theme_royal: {
    ...defaultColors,
    background: '#0f0a1a',
    surface: '#1a102e',
    surfaceLight: '#2d1a4a',
    primary: '#a855f7',
    primaryDark: '#9333ea',
    secondary: '#7c3aed',
    accent: '#fbbf24',
    border: '#2a1a4a',
  },
};

export function getThemeColors(themeKey: string): ThemeColors {
  return THEMES[themeKey] ?? THEMES.default;
}

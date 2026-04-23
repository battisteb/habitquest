export type ThemeKey = 'default' | 'medieval' | 'cyberpunk' | 'nature' | 'lifestyle';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceLight?: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryDark: string;
  secondary?: string;
  accent: string;
  success: string;
  warning?: string;
  danger?: string;
  streak: string;
  xp: string;
  gold: string;
}

export const THEMES: Record<ThemeKey, ThemeColors> = {
  default: {
    background: '#0D0D1A',
    surface: '#1A1A2E',
    border: '#2D2D4E',
    text: '#E8E8FF',
    textSecondary: '#9999CC',
    textMuted: '#555580',
    primary: '#6C63FF',
    primaryDark: '#4A44B3',
    accent: '#FFD700',
    success: '#4CAF50',
    streak: '#FF6B35',
    xp: '#FFD700',
    gold: '#FFC107',
  },
  medieval: {
    background: '#1A0F0A',
    surface: '#2C1A10',
    border: '#4A2E1A',
    text: '#F5E6D0',
    textSecondary: '#C4A882',
    textMuted: '#7A5C3A',
    primary: '#8B6914',
    primaryDark: '#5C4509',
    accent: '#D4AF37',
    success: '#5A8A3C',
    streak: '#CC4422',
    xp: '#D4AF37',
    gold: '#FFB300',
  },
  cyberpunk: {
    background: '#050510',
    surface: '#0D0D20',
    border: '#1A1A40',
    text: '#E0E0FF',
    textSecondary: '#8888CC',
    textMuted: '#444488',
    primary: '#FF00FF',
    primaryDark: '#AA00AA',
    accent: '#00FFFF',
    success: '#00FF88',
    streak: '#FF4444',
    xp: '#FFFF00',
    gold: '#FFD700',
  },
  nature: {
    background: '#0A1A0A',
    surface: '#102010',
    border: '#1E3A1E',
    text: '#D8F0D8',
    textSecondary: '#90B890',
    textMuted: '#4A6A4A',
    primary: '#4CAF50',
    primaryDark: '#2E7D32',
    accent: '#FFB300',
    success: '#66BB6A',
    streak: '#FF7043',
    xp: '#FFB300',
    gold: '#FFC107',
  },
  lifestyle: {
    background: '#0F0F10',
    surface: '#1A1A1C',
    surfaceLight: '#252528',
    border: '#2C2C2E',
    text: '#F2F2F7',
    textSecondary: '#AEAEB2',
    textMuted: '#636366',
    primary: '#7C6DFA',
    primaryDark: '#5B4FD0',
    secondary: '#FF6B9D',
    accent: '#F5CB5C',
    success: '#30D158',
    warning: '#FF9F0A',
    danger: '#FF453A',
    streak: '#FF6B35',
    xp: '#7C6DFA',
    gold: '#F5CB5C',
  },
};

export const THEME_META: Record<ThemeKey, { name: string; emoji: string; description: string }> = {
  default: { name: 'Dark Dungeon', emoji: '🌑', description: 'The classic dark pixel art theme.' },
  medieval: { name: 'Medieval Kingdom', emoji: '🏰', description: 'Stone, gold, and torchlight.' },
  cyberpunk: { name: 'Cyberpunk City', emoji: '🌆', description: 'Neon lights and dark streets.' },
  nature: { name: 'Forest Temple', emoji: '🌿', description: 'Ancient wood and lush greens.' },
  lifestyle: { name: 'Lifestyle', emoji: '✨', description: 'Clean, minimal, modern. Moins donjon, plus quotidien.' },
};

export function getThemeColors(themeKey: string): ThemeColors {
  return THEMES[themeKey as ThemeKey] ?? THEMES.default;
}

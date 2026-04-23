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
    background: '#F7F5F0',
    surface: '#FFFFFF',
    surfaceLight: '#EEEAE1',
    border: '#E2DDD4',
    text: '#18171A',
    textSecondary: '#4A4852',
    textMuted: '#9A9699',
    primary: '#6C5CE7',
    primaryDark: '#4B3DB5',
    secondary: '#E06C84',
    accent: '#D4A843',
    success: '#2D9966',
    warning: '#CC8800',
    danger: '#CC3333',
    streak: '#D45C2A',
    xp: '#6C5CE7',
    gold: '#D4A843',
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

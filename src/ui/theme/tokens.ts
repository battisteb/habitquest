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

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
} as const;

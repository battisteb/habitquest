export const CATEGORY_CONFIG = {
  health: { color: '#4ecca3', icon: '💚', label: 'Health' },
  fitness: { color: '#ff6b35', icon: '💪', label: 'Fitness' },
  learning: { color: '#7b68ee', icon: '📚', label: 'Learning' },
  mindfulness: { color: '#e684ae', icon: '🧘', label: 'Mindfulness' },
  productivity: { color: '#00b4d8', icon: '⚡', label: 'Productivity' },
  nutrition: { color: '#22c55e', icon: '🥗', label: 'Nutrition' },
  sleep: { color: '#8b5cf6', icon: '😴', label: 'Sleep' },
  social: { color: '#f59e0b', icon: '🤝', label: 'Social' },
  creativity: { color: '#ec4899', icon: '🎨', label: 'Creativity' },
  finance: { color: '#10b981', icon: '💰', label: 'Finance' },
  general: { color: '#aaa', icon: '⭐', label: 'General' },
} as const;

export const HABIT_CATEGORIES = Object.keys(CATEGORY_CONFIG) as HabitCategory[];

export type HabitCategory = keyof typeof CATEGORY_CONFIG;

export function getCategoryColor(category: string): string {
  return (CATEGORY_CONFIG as any)[category]?.color ?? CATEGORY_CONFIG.general.color;
}

export function getCategoryIcon(category: string): string {
  return (CATEGORY_CONFIG as any)[category]?.icon ?? CATEGORY_CONFIG.general.icon;
}

export const HABIT_CATEGORIES = [
  'sport',
  'studies',
  'wellness',
  'meditation',
  'stretching',
  'reading',
  'custom',
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

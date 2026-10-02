/**
 * Habits on chosen days of the week (frequency 'days', habits.days holds ISO
 * weekdays: 1 = Monday … 7 = Sunday). Mirrors public.habit_due_on: the
 * server refuses a completion on a rest day and never counts rest days as
 * missed.
 */
export const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;

interface Scheduled {
  frequency?: string | null;
  days?: number[] | null;
}

/** ISO weekday of a date in the device's time zone (1 = Monday). */
export function isoWeekday(date: Date = new Date()): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

/** Is the habit due that day? Daily and "N times a week" habits always are. */
export function isDueOn(habit: Scheduled, date: Date = new Date()): boolean {
  if (habit.frequency !== 'days') return true;
  return (habit.days ?? []).includes(isoWeekday(date));
}

/** Days to preselect when switching to chosen days (from a template's "N times a week"). */
export function defaultDays(frequency?: string | null): number[] {
  if (frequency === '2x_week') return [2, 4];
  if (frequency === '4x_week') return [1, 2, 4, 5];
  if (frequency === '5x_week') return [1, 2, 3, 4, 5];
  return [1, 3, 5];
}

/** Frequency and days to save: all seven days is simply "every day". */
export function scheduleToSave(days: number[]): { frequency: string; days: number[] | null } {
  const sorted = [...new Set(days)].filter((d) => d >= 1 && d <= 7).sort((a, b) => a - b);
  if (sorted.length === 0 || sorted.length === 7) return { frequency: 'daily', days: null };
  return { frequency: 'days', days: sorted };
}

/** "Mon · Wed · Fri" from the localized short day names (index 0 = Monday). */
export function daysLabel(days: number[] | null | undefined, shortNames: string[]): string {
  return [...(days ?? [])].sort((a, b) => a - b).map((d) => shortNames[d - 1]).join(' · ');
}

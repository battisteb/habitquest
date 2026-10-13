import type { Strings } from '../../../lib/i18n';
import { MASTERY } from '../../../lib/constants/game-config';

/**
 * A quest's goal (ADR 033): a number and a unit ("20 min"), optional. After 21 days in a row the
 * app offers to raise it; the server (raise_habit_goal) checks and gives the star.
 */
export const GOAL_UNITS = ['min', 'h', 'km', 'pages', 'steps', 'reps', 'glasses', 'servings', 'times'] as const;
export type GoalUnit = (typeof GOAL_UNITS)[number];

export interface HabitGoal {
  goal_value?: number | null;
  goal_unit?: string | null;
  mastery_level?: number | null;
  mastery_since?: string | null;
}

/** "20", "12.5", "10000" — no useless decimals (as the server writes it in the quest's name). */
export function goalNumber(value: number): string {
  return String(Math.round(value * 100) / 100);
}

export function goalLabel(T: Strings, value: number, unit: string): string {
  const key = `goal_unit_${unit}` as keyof Strings;
  return (T[key] ?? '{n} ' + unit).replace('{n}', goalNumber(value));
}

/** The raise the app suggests: about +25 %, on a step that feels natural for the unit. */
export function nextGoal(value: number, unit: string): number {
  const step = unit === 'steps' ? 1000
    : unit === 'km' || unit === 'h' ? 0.5
      : ['min', 'pages', 'reps'].includes(unit) && value >= 10 ? 5
        : 1;
  const raised = Math.max(value * 1.25, value + step);
  return Math.min(Math.ceil(raised / step) * step, value * 3);
}

/** Days between two calendar dates "YYYY-MM-DD" (local, no time zone shift). */
function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** The quest can be raised now: a goal, fewer than 3 stars, 21 days in a row, 21 days after the last star. */
export function canRaiseGoal(habit: HabitGoal, streak: number, today: string): boolean {
  if (!habit.goal_value || !habit.goal_unit) return false;
  if ((habit.mastery_level ?? 0) >= MASTERY.MAX_STARS) return false;
  if (streak < MASTERY.STREAK_DAYS) return false;
  return !habit.mastery_since || daysBetween(habit.mastery_since, today) >= MASTERY.STREAK_DAYS;
}

/** The quest's name with its old goal number replaced by the new one ("Run 20 min" → "Run 25 min"). */
export function renameWithGoal(name: string, oldValue: number, newValue: number): string {
  const old = goalNumber(oldValue).replace('.', '\\.');
  return name.replace(new RegExp(`(^|[^0-9])${old}([^0-9]|$)`), `$1${goalNumber(newValue)}$2`);
}

/** ★ per star (bronze, silver, gold in the UI). */
export const masteryStars = (level?: number | null) => '★'.repeat(Math.max(0, Math.min(level ?? 0, MASTERY.MAX_STARS)));

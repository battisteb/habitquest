import { getXpForLevel } from '../../../lib/constants/game-config';

/** Days of history used to measure the player's pace. */
export const PACE_DAYS = 14;

/**
 * When the player will reach a level at their recent pace (average XP per
 * day over the last PACE_DAYS days). Null without a pace, or when the date
 * would be too far to motivate (more than a year).
 */
export function projectLevelDate(
  currentXp: number,
  targetLevel: number,
  recentXp: number,
  now: Date = new Date(),
): Date | null {
  const perDay = recentXp / PACE_DAYS;
  if (perDay <= 0) return null;
  const needed = getXpForLevel(targetLevel) - currentXp;
  if (needed <= 0) return null;
  const days = Math.ceil(needed / perDay);
  if (days > 365) return null;
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date;
}

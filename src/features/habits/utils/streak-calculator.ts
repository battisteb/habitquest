const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar days between two dates on the device's clock, whatever the length of the days between
 * them (a daylight-saving change makes one day 23 or 25 hours long). */
function localDaysBetween(from: Date, to: Date): number {
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((day(to) - day(from)) / ONE_DAY_MS);
}

export function isStreakActive(lastCompletedAt: string | null, now: Date = new Date()): boolean {
  if (!lastCompletedAt) return false;
  // Streak is active if completed today or yesterday
  return localDaysBetween(new Date(lastCompletedAt), now) <= 1;
}

export function isCompletedToday(lastCompletedAt: string | null): boolean {
  if (!lastCompletedAt) return false;

  const lastDate = new Date(lastCompletedAt);
  const today = new Date();

  return (
    lastDate.getFullYear() === today.getFullYear() &&
    lastDate.getMonth() === today.getMonth() &&
    lastDate.getDate() === today.getDate()
  );
}

export function calculateNewStreak(
  currentCount: number,
  longestCount: number,
  lastCompletedAt: string | null,
): { currentCount: number; longestCount: number } {
  if (isCompletedToday(lastCompletedAt)) {
    // Already completed today — no change
    return { currentCount, longestCount };
  }

  const newCount = isStreakActive(lastCompletedAt) ? currentCount + 1 : 1;
  const newLongest = Math.max(longestCount, newCount);

  return { currentCount: newCount, longestCount: newLongest };
}

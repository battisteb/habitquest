const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function isStreakActive(lastCompletedAt: string | null): boolean {
  if (!lastCompletedAt) return false;

  const lastDate = new Date(lastCompletedAt);
  const today = new Date();

  // Reset time parts to compare dates only
  const lastDay = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const diffMs = todayDay.getTime() - lastDay.getTime();
  // Streak is active if completed today or yesterday
  return diffMs <= ONE_DAY_MS;
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

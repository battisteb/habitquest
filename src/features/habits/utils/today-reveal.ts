/**
 * Progressive Today (D5, Battiste OK): a new player first sees the hero and
 * the quests; the rest arrives over the first week, one thing at a time.
 * Day 1 is the sign-up day (device's local days).
 */
export const TODAY_REVEAL = { missions: 2, boss: 3, mood: 7 } as const;
export type TodayPart = keyof typeof TODAY_REVEAL;

/** Day of the adventure: 1 on the sign-up day. Unknown date = an old account. */
export function adventureDay(createdAt: string | null | undefined, now: Date = new Date()): number {
  if (!createdAt) return Number.MAX_SAFE_INTEGER;
  const start = new Date(createdAt);
  if (Number.isNaN(start.getTime())) return Number.MAX_SAFE_INTEGER;
  const day = (d: Date) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.floor((day(now) - day(start)) / 86_400_000) + 1;
}

export function isRevealed(part: TodayPart, day: number): boolean {
  return day >= TODAY_REVEAL[part];
}

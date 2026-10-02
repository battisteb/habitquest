import type { CompanionStage } from '../sprites';

/** Streak (in days) from which each stage is reached, in order. */
export const COMPANION_STAGES: { stage: CompanionStage; minStreak: number }[] = [
  { stage: 'egg', minStreak: 0 },
  { stage: 'hatchling', minStreak: 3 },
  { stage: 'young', minStreak: 7 },
  { stage: 'adult', minStreak: 14 },
  { stage: 'legend', minStreak: 30 },
];

/** The companion grows with the player's best current streak. */
export function companionStage(streak: number): CompanionStage {
  let current: CompanionStage = 'egg';
  for (const s of COMPANION_STAGES) if (streak >= s.minStreak) current = s.stage;
  return current;
}

/**
 * Duel help (Premium): once per fight the dragon breathes a small flame.
 * Kept below one normal attack (~15) so consistency stays what wins.
 */
export const COMPANION_ASSIST: Record<CompanionStage, number> = {
  egg: 0,
  hatchling: 3,
  young: 5,
  adult: 7,
  legend: 10,
};

/** Streak needed for the next stage, or null at the last one. */
export function nextStageStreak(streak: number): number | null {
  return COMPANION_STAGES.find((s) => s.minStreak > streak)?.minStreak ?? null;
}

/** Best current streak among the given habits' streaks. */
export function bestCurrentStreak(streaks: { current_count?: number | null }[]): number {
  return streaks.reduce((best, s) => Math.max(best, s.current_count ?? 0), 0);
}

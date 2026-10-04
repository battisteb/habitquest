import type { Strings } from '../../../lib/i18n';
import { HABIT_CATEGORIES, type HabitCategory } from '../../../lib/constants/categories';

/**
 * Identity milestones (G3): after 7, 21 and 66 days in a row a quest becomes
 * part of who the player is ("You're becoming someone who moves every day").
 * 66 days is the median time for a habit to become automatic (Lally et al.,
 * 2010). Based on the best streak, so a title is never lost (ADR 019 spirit).
 */
export const IDENTITY_STAGES = [7, 21, 66] as const;
export type IdentityStage = (typeof IDENTITY_STAGES)[number];

/** The highest stage reached with this best streak, or null below 7 days. */
export function identityStage(bestStreak: number): IdentityStage | null {
  let stage: IdentityStage | null = null;
  for (const s of IDENTITY_STAGES) if (bestStreak >= s) stage = s;
  return stage;
}

export function isIdentityMilestone(count: number): boolean {
  return (IDENTITY_STAGES as readonly number[]).includes(count);
}

export function identityTitle(T: Strings, stage: IdentityStage): string {
  return T[`identity_stage_${stage}`];
}

/** "You're becoming someone who moves every day." */
export function identitySentence(T: Strings, category: string): string {
  const cat: HabitCategory = (HABIT_CATEGORIES as string[]).includes(category) ? (category as HabitCategory) : 'general';
  return T.identity_becoming.replace('{phrase}', T[`identity_cat_${cat}`]);
}

export interface IdentityEntry {
  habitId: string;
  name: string;
  category: string;
  stage: IdentityStage;
  best: number;
}

/** Quests that became an identity, the strongest first. */
export function identities(
  habits: { id: string; name: string; category: string }[],
  streaks: Record<string, { longest_count?: number | null } | undefined>,
): IdentityEntry[] {
  return habits
    .map((h) => {
      const best = streaks[h.id]?.longest_count ?? 0;
      const stage = identityStage(best);
      return stage ? { habitId: h.id, name: h.name, category: h.category, stage, best } : null;
    })
    .filter((e): e is IdentityEntry => e !== null)
    .sort((a, b) => b.best - a.best);
}

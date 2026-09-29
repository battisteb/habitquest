import { calculateXpEarned, getXpForLevel } from '../../../lib/constants/game-config';
import type { Strings } from '../../../lib/i18n';

export type HeroLine =
  | { kind: 'no_habits' }
  | { kind: 'all_done' }
  | { kind: 'level_up'; count: number; nextLevel: number }
  | { kind: 'pending'; count: number };

interface HeroLineInput {
  totalHabits: number;
  /** Current streak of each habit still to validate today. */
  pendingStreaks: number[];
  xp: number;
  level: number;
}

/**
 * What the hero says on the Today screen. When validating the remaining habits
 * reaches the next level, it counts how few are needed (biggest rewards first).
 */
export function heroLine({ totalHabits, pendingStreaks, xp, level }: HeroLineInput): HeroLine {
  if (totalHabits === 0) return { kind: 'no_habits' };
  if (pendingStreaks.length === 0) return { kind: 'all_done' };

  const missing = getXpForLevel(level + 1) - xp;
  const rewards = pendingStreaks.map((s) => calculateXpEarned(s + 1)).sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < rewards.length; i++) {
    sum += rewards[i];
    if (sum >= missing) return { kind: 'level_up', count: i + 1, nextLevel: level + 1 };
  }
  return { kind: 'pending', count: pendingStreaks.length };
}

export function heroText(T: Strings, line: HeroLine): string {
  switch (line.kind) {
    case 'no_habits':
      return T.hero_no_habits;
    case 'all_done':
      return T.hero_all_done;
    case 'level_up':
      return (line.count === 1 ? T.hero_level_up_one : T.hero_level_up_many)
        .replace('{n}', String(line.count))
        .replace('{level}', String(line.nextLevel));
    case 'pending':
      return (line.count === 1 ? T.hero_pending_one : T.hero_pending_many).replace('{n}', String(line.count));
  }
}

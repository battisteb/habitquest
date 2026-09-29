export const XP_CONFIG = {
  BASE_XP_PER_COMPLETION: 10,
  STREAK_MULTIPLIER_CAP: 5,
  STREAK_MULTIPLIER_STEP: 0.1,
} as const;

/**
 * XP needed for levels 1 to 11 (level 1 = 0 XP). Players start at level 1.
 * Past the table, one level every LEVEL_XP_BEYOND_TABLE XP.
 * Mirrored in SQL by public.level_for_xp — change both together (ADR 010).
 */
export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000,
] as const;

const LEVEL_XP_BEYOND_TABLE = 2000;
const LAST_TABLE_LEVEL = LEVEL_THRESHOLDS.length; // 11

/** Total XP required to reach `level` (level ≥ 1). */
export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level <= LAST_TABLE_LEVEL) return LEVEL_THRESHOLDS[level - 1];
  return LEVEL_THRESHOLDS[LAST_TABLE_LEVEL - 1] + (level - LAST_TABLE_LEVEL) * LEVEL_XP_BEYOND_TABLE;
}

export function getLevelForXp(xp: number): number {
  const lastXp = LEVEL_THRESHOLDS[LAST_TABLE_LEVEL - 1];
  if (xp >= lastXp) {
    return LAST_TABLE_LEVEL + Math.floor((xp - lastXp) / LEVEL_XP_BEYOND_TABLE);
  }
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

/** Total XP required for the level after `currentLevel`. */
export function getXpForNextLevel(currentLevel: number): number {
  return getXpForLevel(currentLevel + 1);
}

export function calculateXpEarned(streakCount: number): number {
  const multiplier = Math.min(
    1 + streakCount * XP_CONFIG.STREAK_MULTIPLIER_STEP,
    XP_CONFIG.STREAK_MULTIPLIER_CAP,
  );
  return Math.round(XP_CONFIG.BASE_XP_PER_COMPLETION * multiplier);
}

export const RANKS = [
  // Rank XP: 0, 250, 850, 1900, 3500, 6000 (Legend was unreachable before ADR 010).
  { name: 'Novice', minLevel: 1, color: '#aaa' },
  { name: 'Apprentice', minLevel: 3, color: '#4ecca3' },
  { name: 'Warrior', minLevel: 5, color: '#e94560' },
  { name: 'Knight', minLevel: 7, color: '#f5c518' },
  { name: 'Champion', minLevel: 9, color: '#7b68ee' },
  { name: 'Legend', minLevel: 11, color: '#ff6b35' },
] as const;

export function getRankForLevel(level: number): (typeof RANKS)[number] {
  let rank: (typeof RANKS)[number] = RANKS[0];
  for (const r of RANKS) {
    if (level >= r.minLevel) {
      rank = r;
    } else {
      break;
    }
  }
  return rank;
}

export const GOLD_CONFIG = {
  GOLD_PER_XP_RATIO: 0.1,
  CHALLENGE_MIN_WAGER: 5,
  CHALLENGE_MAX_WAGER: 100,
} as const;

export function calculateGoldEarned(xpEarned: number): number {
  return Math.floor(xpEarned * GOLD_CONFIG.GOLD_PER_XP_RATIO);
}

/**
 * Co-op challenges (ADR 013). Bounds and reward are enforced by
 * public.create_coop_challenge / coop_on_completion — change both together.
 */
export const COOP = {
  MIN_FRIENDS: 1,
  MAX_FRIENDS: 3,
  DURATIONS: [3, 7, 14] as const,
  REWARD_RATIO: 0.5,
  TARGET_BOUNDS: {
    validations: { min: 3, max: 200 },
    xp: { min: 30, max: 5000 },
  },
} as const;

export type CoopGoal = keyof typeof COOP.TARGET_BOUNDS;

export function clampCoopTarget(goal: CoopGoal, target: number): number {
  const { min, max } = COOP.TARGET_BOUNDS[goal];
  return Math.min(Math.max(Math.round(target), min), max);
}

/** A fair default: about one validation per player per day (10 XP each for an XP goal). */
export function suggestCoopTarget(goal: CoopGoal, players: number, days: number): number {
  const validations = players * days;
  return clampCoopTarget(goal, goal === 'xp' ? validations * XP_CONFIG.BASE_XP_PER_COMPLETION : validations);
}

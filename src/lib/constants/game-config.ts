export const XP_CONFIG = {
  BASE_XP_PER_COMPLETION: 10,
  STREAK_MULTIPLIER_CAP: 5,
  STREAK_MULTIPLIER_STEP: 0.1,
} as const;

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000,
] as const;

export function getLevelForXp(xp: number): number {
  let level = 0;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
    } else {
      break;
    }
  }
  return level;
}

export function getXpForNextLevel(currentLevel: number): number {
  if (currentLevel + 1 < LEVEL_THRESHOLDS.length) {
    return LEVEL_THRESHOLDS[currentLevel + 1];
  }
  // Beyond defined thresholds: exponential growth
  const lastThreshold = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const levelsAbove = currentLevel + 1 - (LEVEL_THRESHOLDS.length - 1);
  return lastThreshold + levelsAbove * 2000;
}

export function calculateXpEarned(streakCount: number): number {
  const multiplier = Math.min(
    1 + streakCount * XP_CONFIG.STREAK_MULTIPLIER_STEP,
    XP_CONFIG.STREAK_MULTIPLIER_CAP,
  );
  return Math.round(XP_CONFIG.BASE_XP_PER_COMPLETION * multiplier);
}

export const RANKS = [
  { name: 'Novice', minLevel: 0, color: '#aaa' },
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

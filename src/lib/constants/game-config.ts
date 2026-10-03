export const XP_CONFIG = {
  BASE_XP_PER_COMPLETION: 10,
  STREAK_MULTIPLIER_CAP: 5,
  STREAK_MULTIPLIER_STEP: 0.1,
} as const;

/**
 * No penalty when a streak breaks: the next 24 hours earn double XP, to
 * reward getting back on track (ADR 019). Mirrored in SQL by
 * process_streak_breaks / complete_habit.
 */
export const COMEBACK = {
  XP_MULTIPLIER: 2,
  WINDOW_HOURS: 24,
} as const;

/**
 * A broken streak can be repaired for 48 hours (ADR 021): 3 gold per streak
 * day, 15 to 150, or one rewarded ad a day for free players. Mirrored in SQL
 * by public.streak_repair_cost.
 */
export const STREAK_REPAIR = {
  WINDOW_HOURS: 48,
  GOLD_PER_DAY: 3,
  MIN_GOLD: 15,
  MAX_GOLD: 150,
} as const;

export function streakRepairCost(streakCount: number): number {
  return Math.min(Math.max(STREAK_REPAIR.GOLD_PER_DAY * streakCount, STREAK_REPAIR.MIN_GOLD), STREAK_REPAIR.MAX_GOLD);
}

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
 * Arenas (ADR 012): 6 leagues, 10-day seasons, groups of 11.
 * Fights are resolved by the server (public.arena_attack_power / arena_defense_power);
 * these mirrors only drive the previews on the arena screen — change both together.
 */
export const ARENA = {
  LEAGUES: ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master'] as const,
  SEASON_DAYS: 10,
  GROUP_SIZE: 11,
  PROMOTED: 3,
  RELEGATED: 3,
  BASE_POWER: 100,
  ATTACK_PER_HABIT: 30,
  DEFENSE_PER_HABIT: 15,
  HABIT_CAP: 5,
  POWER_PER_LEVEL: 2,
  POWER_PER_STREAK_DAY: 3,
  STREAK_CAP: 30,
  LUCK_MIN: 0.85,
  LUCK_MAX: 1.15,
  WIN_POINTS: 3,
  EFFORT_POINTS: 1,
  WIN_GOLD: 10,
} as const;

export type ArenaLeague = (typeof ARENA.LEAGUES)[number];

function arenaPower(perHabit: number, habits: number, level: number, streak: number): number {
  return (
    ARENA.BASE_POWER +
    perHabit * Math.min(Math.max(habits, 0), ARENA.HABIT_CAP) +
    ARENA.POWER_PER_LEVEL * Math.max(level, 0) +
    ARENA.POWER_PER_STREAK_DAY * Math.min(Math.max(streak, 0), ARENA.STREAK_CAP)
  );
}

export function getArenaAttackPower(habits: number, level: number, streak: number): number {
  return arenaPower(ARENA.ATTACK_PER_HABIT, habits, level, streak);
}

export function getArenaDefensePower(habits: number, level: number, streak: number): number {
  return arenaPower(ARENA.DEFENSE_PER_HABIT, habits, level, streak);
}

/** Win odds of an attack, given the luck factor is uniform over 0.85..1.15 (31 steps). */
export function getArenaWinChance(attackPower: number, defensePower: number): number {
  let wins = 0;
  for (let step = 0; step <= 30; step += 1) {
    if (Math.round((attackPower * (85 + step)) / 100) > defensePower) wins += 1;
  }
  return wins / 31;
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

/**
 * Equipment in combat (ADR 017): each equipped item gives points by rarity to
 * one stat. Duels are simulated in the app with GEAR.DUEL; arena fights are
 * resolved by the server (public.gear_stats, arena_gear_attack/defense) with
 * GEAR.ARENA — change both together. Kept light so consistency stays what wins.
 */
export const GEAR = {
  // Capped at the rare level: epic/legendary (Premium) items are a cosmetic upgrade, not more power (I3).
  RARITY_POINTS: { common: 1, uncommon: 2, rare: 3, epic: 3, legendary: 3 } as Record<string, number>,
  STAT_BY_CATEGORY: { avatar_accessory: 'attack', avatar_hat: 'defense', avatar_outfit: 'hp' } as Record<string, GearStat>,
  DUEL: { DAMAGE_PCT_PER_ATTACK: 3, BLOCK_PCT_PER_DEFENSE: 3, HP_PER_POINT: 4, BASE_HP: 100 },
  ARENA: { ATTACK_PER_POINT: 4, DEFENSE_PER_POINT: 2 },
} as const;

export type GearStat = 'attack' | 'defense' | 'hp';
export interface GearStats { attack: number; defense: number; hp: number }

/** The stat an item improves and by how many points, or null for cosmetics. */
export function itemGearBonus(category: string, rarity: string): { stat: GearStat; points: number } | null {
  const stat = GEAR.STAT_BY_CATEGORY[category];
  const points = GEAR.RARITY_POINTS[rarity] ?? 0;
  return stat && points > 0 ? { stat, points } : null;
}

/** Points per stat of a set of equipped items. */
export function gearStats(items: { category: string; rarity: string }[]): GearStats {
  const out: GearStats = { attack: 0, defense: 0, hp: 0 };
  for (const i of items) {
    const bonus = itemGearBonus(i.category, i.rarity);
    if (bonus) out[bonus.stat] += bonus.points;
  }
  return out;
}

/** What the equipment changes in a duel. */
export function duelGearEffects(stats: GearStats): { damageMult: number; damageTakenMult: number; maxHp: number } {
  return {
    damageMult: 1 + (GEAR.DUEL.DAMAGE_PCT_PER_ATTACK * stats.attack) / 100,
    damageTakenMult: 1 - (GEAR.DUEL.BLOCK_PCT_PER_DEFENSE * stats.defense) / 100,
    maxHp: GEAR.DUEL.BASE_HP + GEAR.DUEL.HP_PER_POINT * stats.hp,
  };
}

/** Damage of a hit once both fighters' equipment is applied (at least 1). */
export function applyGearToDamage(damage: number, attacker: GearStats, defender: GearStats): number {
  if (damage <= 0) return damage;
  const a = duelGearEffects(attacker);
  const d = duelGearEffects(defender);
  return Math.max(1, Math.round(damage * a.damageMult * d.damageTakenMult));
}

/**
 * Progressive unlocks (I6): features open as the hero levels up, announced by
 * Pip. The server enforces them (public.unlock_level) — change both together.
 */
export const UNLOCKS = { arena: 3, duels: 5, coop: 5 } as const;
export type UnlockFeature = keyof typeof UNLOCKS;

export function isUnlocked(feature: UnlockFeature, level: number): boolean {
  return level >= UNLOCKS[feature];
}

/** Features that open when the hero goes from `from` to `to`, in level order. */
export function newlyUnlocked(from: number, to: number): UnlockFeature[] {
  return (Object.keys(UNLOCKS) as UnlockFeature[])
    .filter((f) => from < UNLOCKS[f] && to >= UNLOCKS[f])
    .sort((a, b) => UNLOCKS[a] - UNLOCKS[b]);
}

/**
 * Weekly boss (I9): every validated quest of the week hits it; its HP is set
 * so that about 80 % of the week's planned quests defeat it. Resolved by the
 * server (public.refresh_weekly_boss) — change both together.
 */
/**
 * Seasonal arcs (ADR 024): 4 a year, one rune each. A good week = at least
 * 70 % of the planned validations; 8 good weeks earn the rune. Mirrored in
 * SQL by public.arc_state_for (supabase/migrations/20261003140000_seasonal_arcs.sql).
 */
export const ARC = {
  GOOD_WEEK_PCT: 70,
  GOOD_WEEKS_FOR_RUNE: 8,
  RUNE_XP: 100,
  RUNE_GOLD: 50,
  FOUR_SEASONS_PREMIUM_DAYS: 7,
  FOUR_SEASONS_GOLD_IF_PREMIUM: 500,
} as const;

/** Arc order in the year, starting with the Winter Arc (October). */
export const SEASONS = ['winter', 'spring', 'summer', 'autumn'] as const;
export type Season = (typeof SEASONS)[number];

export const BOSS = {
  HIT: 10,
  HP_PER_PLANNED: 8,
  MIN_PLANNED: 5,
  REWARD_XP: 50,
  REWARD_GOLD: 25,
} as const;

/** Validations still needed to defeat a boss. */
export function hitsToDefeat(hpMax: number, damage: number): number {
  return Math.max(0, Math.ceil((hpMax - damage) / BOSS.HIT));
}

/**
 * Ads (D9): no full-screen ad during a new player's first week, and never
 * before a duel (a fun moment with a friend must not be interrupted).
 */
export const ADS = { interstitialGraceDays: 7 } as const;

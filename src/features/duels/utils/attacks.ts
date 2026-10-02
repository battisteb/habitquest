import { RANKS } from '../../../lib/constants/game-config';

export interface Attack {
  id: string;
  name: string;
  emoji: string;
  /** Habit category that unlocks it (7 completions), or 'general' (always) or 'level'. */
  category: string;
  /** For level attacks: the hero level that unlocks them. */
  minLevel?: number;
  baseDamage: number;
  hitChance: number;
  description: string;
  special?: 'shield' | 'double' | 'heal';
}

/** One attack per habit category of the app, unlocked by completing a habit of it 7 times. */
const CATEGORY_ATTACKS: Attack[] = [
  { id: 'vital_strike', name: 'Vital Strike', emoji: '❤️', category: 'health', baseDamage: 16, hitChance: 0.88, description: 'A healthy body hits harder.' },
  { id: 'sprint', name: 'Sprint Dash', emoji: '🏃', category: 'fitness', baseDamage: 18, hitChance: 0.85, description: 'A burst of athletic speed.' },
  { id: 'mind_blast', name: 'Mind Blast', emoji: '🔮', category: 'learning', baseDamage: 22, hitChance: 0.70, description: 'Raw intellectual power.' },
  { id: 'zen_shield', name: 'Zen Shield', emoji: '🧘', category: 'mindfulness', baseDamage: 8, hitChance: 0.99, description: 'Perfect focus, unshakeable.', special: 'shield' },
  { id: 'deadline_rush', name: 'Deadline Rush', emoji: '⏱️', category: 'productivity', baseDamage: 20, hitChance: 0.75, description: 'Everything done, right on time.' },
  { id: 'fuel_up', name: 'Fuel Up', emoji: '🍎', category: 'nutrition', baseDamage: 9, hitChance: 0.95, description: 'Good food, fresh strength: recover HP.', special: 'heal' },
  { id: 'rest_recover', name: 'Deep Rest', emoji: '😴', category: 'sleep', baseDamage: 6, hitChance: 0.99, description: 'Recover HP this turn.', special: 'heal' },
  { id: 'social_power', name: 'Rally Cry', emoji: '📣', category: 'social', baseDamage: 14, hitChance: 0.88, description: 'The strength of community.', special: 'double' },
  { id: 'creative_surge', name: 'Creative Surge', emoji: '🎨', category: 'creativity', baseDamage: 20, hitChance: 0.72, description: 'Unpredictable and explosive.' },
  { id: 'gold_rush', name: 'Gold Rush', emoji: '💰', category: 'finance', baseDamage: 17, hitChance: 0.80, description: 'Every coin saved becomes a blow.' },
  { id: 'balanced_attack', name: 'Balanced Form', emoji: '⚖️', category: 'general', baseDamage: 15, hitChance: 0.85, description: 'Reliable and steady.' },
];

/** One attack per rank: the hero learns it on reaching the rank's level. */
const LEVEL_ATTACKS: Attack[] = [
  { id: 'iron_will', name: 'Iron Will', emoji: '🛡️', category: 'level', minLevel: 3, baseDamage: 10, hitChance: 0.95, description: 'Resilience forged through training.', special: 'shield' },
  { id: 'power_strike', name: 'Power Strike', emoji: '⚡', category: 'level', minLevel: 5, baseDamage: 24, hitChance: 0.65, description: 'High risk, devastating reward.' },
  { id: 'knight_charge', name: "Knight's Charge", emoji: '🐎', category: 'level', minLevel: 7, baseDamage: 26, hitChance: 0.70, description: 'A charge nothing can stop.' },
  { id: 'champion_blow', name: "Champion's Blow", emoji: '🏆', category: 'level', minLevel: 9, baseDamage: 28, hitChance: 0.72, description: 'The strike of the best.' },
  { id: 'legend_strike', name: 'Legendary Strike', emoji: '🌟', category: 'level', minLevel: 11, baseDamage: 30, hitChance: 0.78, description: 'A blow for the history books.' },
];

export const ATTACKS: Attack[] = [...CATEGORY_ATTACKS, ...LEVEL_ATTACKS];

/** Every habit category that gives an attack. */
export const ATTACK_CATEGORIES = CATEGORY_ATTACKS.filter((a) => a.category !== 'general').map((a) => a.category);

/** +1 damage on every attack for each rank reached above Novice (0 to 5). */
export function rankDamageBonus(level: number): number {
  return RANKS.filter((r) => level >= r.minLevel).length - 1;
}

/**
 * Attacks a hero can use: the general one, those of the habit categories
 * unlocked (7 completions), and those of the levels reached, with the rank
 * damage bonus applied.
 */
export function getUnlockedAttacks(unlockedCategories: string[], level = 1): Attack[] {
  const bonus = rankDamageBonus(level);
  return ATTACKS.filter((a) =>
    a.category === 'general' ||
    (a.category === 'level' ? level >= (a.minLevel ?? Infinity) : unlockedCategories.includes(a.category)),
  ).map((a) => (bonus ? { ...a, baseDamage: a.baseDamage + bonus } : a));
}

/** The next level attack the hero will learn, if any. */
export function nextLevelAttack(level: number): Attack | null {
  return LEVEL_ATTACKS.find((a) => (a.minLevel ?? 0) > level) ?? null;
}

/** Expected damage per turn, to pick a strong loadout. */
function power(a: Attack): number {
  return a.baseDamage * a.hitChance + (a.special ? 4 : 0);
}

/** The 4 attacks taken into a battle: the opening one first, then the strongest. */
export function battleLoadout(attacks: Attack[], openingId?: string | null, size = 4): Attack[] {
  const opening = attacks.find((a) => a.id === openingId);
  const rest = attacks.filter((a) => a !== opening).sort((x, y) => power(y) - power(x));
  return (opening ? [opening, ...rest] : rest).slice(0, size);
}

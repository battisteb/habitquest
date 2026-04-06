export interface Attack {
  id: string;
  name: string;
  emoji: string;
  category: string;
  baseDamage: number;
  hitChance: number;
  description: string;
  special?: 'shield' | 'double' | 'heal';
}

export const ATTACKS: Attack[] = [
  { id: 'sprint', name: 'Sprint Dash', emoji: '🏃', category: 'fitness', baseDamage: 18, hitChance: 0.85, description: 'A burst of athletic speed.' },
  { id: 'iron_will', name: 'Iron Will', emoji: '🛡️', category: 'fitness', baseDamage: 10, hitChance: 0.95, description: 'Resilience forged through training.', special: 'shield' },
  { id: 'mind_blast', name: 'Mind Blast', emoji: '🔮', category: 'learning', baseDamage: 22, hitChance: 0.70, description: 'Raw intellectual power.' },
  { id: 'study_surge', name: 'Study Surge', emoji: '📚', category: 'studies', baseDamage: 16, hitChance: 0.80, description: 'Knowledge is power.' },
  { id: 'zen_shield', name: 'Zen Shield', emoji: '🧘', category: 'mindfulness', baseDamage: 8, hitChance: 0.99, description: 'Perfect focus, unshakeable.', special: 'shield' },
  { id: 'creative_surge', name: 'Creative Surge', emoji: '🎨', category: 'creativity', baseDamage: 20, hitChance: 0.72, description: 'Unpredictable and explosive.' },
  { id: 'social_power', name: 'Rally Cry', emoji: '📣', category: 'social', baseDamage: 14, hitChance: 0.88, description: 'The strength of community.', special: 'double' },
  { id: 'rest_recover', name: 'Deep Rest', emoji: '😴', category: 'sleep', baseDamage: 6, hitChance: 0.99, description: 'Recover HP this turn.', special: 'heal' },
  { id: 'power_strike', name: 'Power Strike', emoji: '⚡', category: 'sport', baseDamage: 24, hitChance: 0.65, description: 'High risk, devastating reward.' },
  { id: 'balanced_attack', name: 'Balanced Form', emoji: '⚖️', category: 'general', baseDamage: 15, hitChance: 0.85, description: 'Reliable and steady.' },
];

/**
 * Get attacks unlocked for a player based on their habit categories.
 * A category is "unlocked" if passed in unlockedCategories array.
 * Always include 'balanced_attack' as a fallback.
 */
export function getUnlockedAttacks(unlockedCategories: string[]): Attack[] {
  return ATTACKS.filter(
    (a) => a.category === 'general' || unlockedCategories.includes(a.category),
  );
}

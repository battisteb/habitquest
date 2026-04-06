export type ShopItemCategory = 'theme' | 'avatar' | 'powerup';

export interface UnlockCondition {
  type: 'level' | 'streak' | 'achievement';
  value: number | string; // level number, streak count, or achievement id
  label: string;          // human-readable, e.g. "Reach Level 5"
}

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  description: string;
  category: ShopItemCategory;
  price: number; // in gold coins
  unlockCondition?: UnlockCondition;
}

export const SHOP_ITEMS: ShopItem[] = [
  // Themes
  {
    id: 'theme_medieval',
    name: 'Medieval Kingdom',
    emoji: '🏰',
    description: 'Dark stone walls, torches, and a royal palette.',
    category: 'theme',
    price: 500,
    unlockCondition: { type: 'level', value: 5, label: 'Reach Level 5' },
  },
  {
    id: 'theme_cyberpunk',
    name: 'Cyberpunk City',
    emoji: '🌆',
    description: 'Neon lights and dark streets.',
    category: 'theme',
    price: 800,
    unlockCondition: { type: 'level', value: 10, label: 'Reach Level 10' },
  },
  {
    id: 'theme_nature',
    name: 'Forest Temple',
    emoji: '🌿',
    description: 'Lush greens and ancient wood.',
    category: 'theme',
    price: 400,
    unlockCondition: { type: 'streak', value: 30, label: '30-day streak on any habit' },
  },
  {
    id: 'theme_futuristic',
    name: 'Space Station',
    emoji: '🚀',
    description: 'Minimalist chrome and starfields.',
    category: 'theme',
    price: 1000,
    unlockCondition: { type: 'level', value: 15, label: 'Reach Level 15' },
  },
  // Power-ups
  {
    id: 'powerup_freeze_pack',
    name: 'Freeze Pack',
    emoji: '❄️',
    description: '+3 streak freezes for the month.',
    category: 'powerup',
    price: 200,
  },
  {
    id: 'powerup_xp_boost',
    name: 'XP Boost',
    emoji: '⚡',
    description: 'Double XP for the next 24 hours.',
    category: 'powerup',
    price: 350,
    unlockCondition: { type: 'level', value: 3, label: 'Reach Level 3' },
  },
  // Avatar items
  {
    id: 'avatar_crown',
    name: 'Pixel Crown',
    emoji: '👑',
    description: 'For true champions only.',
    category: 'avatar',
    price: 1500,
    unlockCondition: { type: 'streak', value: 100, label: '100-day streak' },
  },
  {
    id: 'avatar_cape',
    name: 'Hero Cape',
    emoji: '🦸',
    description: 'A cape worthy of your deeds.',
    category: 'avatar',
    price: 600,
    unlockCondition: { type: 'level', value: 8, label: 'Reach Level 8' },
  },
];

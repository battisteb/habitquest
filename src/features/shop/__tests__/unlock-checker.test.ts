import { isItemUnlocked, getShopCatalog } from '../utils/unlock-checker';
import { SHOP_ITEMS, ShopItem } from '../types/shop-item';

describe('isItemUnlocked', () => {
  const itemNoCondition: ShopItem = {
    id: 'powerup_freeze_pack',
    name: 'Freeze Pack',
    emoji: '❄️',
    description: 'No condition.',
    category: 'powerup',
    price: 200,
  };

  const itemLevelGated: ShopItem = {
    id: 'theme_medieval',
    name: 'Medieval Kingdom',
    emoji: '🏰',
    description: 'Level gated.',
    category: 'theme',
    price: 500,
    unlockCondition: { type: 'level', value: 5, label: 'Reach Level 5' },
  };

  const itemStreakGated: ShopItem = {
    id: 'theme_nature',
    name: 'Forest Temple',
    emoji: '🌿',
    description: 'Streak gated.',
    category: 'theme',
    price: 400,
    unlockCondition: { type: 'streak', value: 30, label: '30-day streak on any habit' },
  };

  const itemAchievementGated: ShopItem = {
    id: 'special_item',
    name: 'Special',
    emoji: '⭐',
    description: 'Achievement gated.',
    category: 'avatar',
    price: 999,
    unlockCondition: { type: 'achievement', value: 'first_blood', label: 'Earn First Blood' },
  };

  it('returns true when there is no unlock condition', () => {
    expect(isItemUnlocked(itemNoCondition, 0, 0)).toBe(true);
  });

  it('returns true when user level meets the requirement', () => {
    expect(isItemUnlocked(itemLevelGated, 5, 0)).toBe(true);
    expect(isItemUnlocked(itemLevelGated, 10, 0)).toBe(true);
  });

  it('returns false when user level is below the requirement', () => {
    expect(isItemUnlocked(itemLevelGated, 4, 0)).toBe(false);
    expect(isItemUnlocked(itemLevelGated, 0, 0)).toBe(false);
  });

  it('returns true when longest streak meets the requirement', () => {
    expect(isItemUnlocked(itemStreakGated, 0, 30)).toBe(true);
    expect(isItemUnlocked(itemStreakGated, 0, 100)).toBe(true);
  });

  it('returns false when longest streak is below the requirement', () => {
    expect(isItemUnlocked(itemStreakGated, 0, 29)).toBe(false);
    expect(isItemUnlocked(itemStreakGated, 0, 0)).toBe(false);
  });

  it('returns false for achievement-type conditions (reserved)', () => {
    expect(isItemUnlocked(itemAchievementGated, 99, 999)).toBe(false);
  });
});

describe('getShopCatalog', () => {
  it('returns an entry for every item in SHOP_ITEMS', () => {
    const catalog = getShopCatalog(0, 0, []);
    expect(catalog).toHaveLength(SHOP_ITEMS.length);
  });

  it('marks owned items correctly', () => {
    const owned = ['powerup_freeze_pack', 'avatar_cape'];
    const catalog = getShopCatalog(10, 0, owned);
    catalog.forEach(({ item, isOwned }) => {
      expect(isOwned).toBe(owned.includes(item.id));
    });
  });

  it('marks level-gated items as locked when level is too low', () => {
    const catalog = getShopCatalog(4, 0, []);
    const medieval = catalog.find((u) => u.item.id === 'theme_medieval');
    expect(medieval?.isUnlocked).toBe(false);
  });

  it('marks level-gated items as unlocked when level is met', () => {
    const catalog = getShopCatalog(5, 0, []);
    const medieval = catalog.find((u) => u.item.id === 'theme_medieval');
    expect(medieval?.isUnlocked).toBe(true);
  });

  it('marks streak-gated items as locked when streak is too low', () => {
    const catalog = getShopCatalog(10, 29, []);
    const nature = catalog.find((u) => u.item.id === 'theme_nature');
    expect(nature?.isUnlocked).toBe(false);
  });

  it('marks streak-gated items as unlocked when streak is met', () => {
    const catalog = getShopCatalog(10, 30, []);
    const nature = catalog.find((u) => u.item.id === 'theme_nature');
    expect(nature?.isUnlocked).toBe(true);
  });

  it('marks items with no condition as always unlocked', () => {
    const catalog = getShopCatalog(0, 0, []);
    const freeze = catalog.find((u) => u.item.id === 'powerup_freeze_pack');
    expect(freeze?.isUnlocked).toBe(true);
  });
});

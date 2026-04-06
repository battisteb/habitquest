import { SHOP_ITEMS, ShopItem } from '../types/shop-item';

export interface UnlockStatus {
  item: ShopItem;
  isUnlocked: boolean;
  isOwned: boolean;
}

/**
 * Checks whether an item's unlock condition is satisfied given the user's
 * current level and longest streak across all habits.
 *
 * Items without an unlockCondition are always available.
 * Items with type 'achievement' are reserved for a future implementation
 * and remain locked until explicit achievement tracking is wired in.
 */
export function isItemUnlocked(
  item: ShopItem,
  userLevel: number,
  longestStreak: number,
): boolean {
  if (!item.unlockCondition) return true;

  const { type, value } = item.unlockCondition;

  if (type === 'level') return userLevel >= (value as number);
  if (type === 'streak') return longestStreak >= (value as number);

  // 'achievement' type — reserved for later
  return false;
}

/**
 * Returns the full static catalog enriched with unlock and ownership status
 * for the given user stats.
 */
export function getShopCatalog(
  userLevel: number,
  longestStreak: number,
  ownedItemIds: string[],
): UnlockStatus[] {
  return SHOP_ITEMS.map((item) => ({
    item,
    isUnlocked: isItemUnlocked(item, userLevel, longestStreak),
    isOwned: ownedItemIds.includes(item.id),
  }));
}

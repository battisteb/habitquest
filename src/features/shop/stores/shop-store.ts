import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { refreshProfile } from '../../gamification/stores/profile-store';
import { checkAndUnlockAchievements } from '../../gamification/stores/achievements-store';
import { persistPlugin } from '../../../lib/storage/persist';
import type { Database } from '../../../lib/supabase/types';
import { resetOnSignOut } from '../../../lib/storage/user-data';
import { gearStats, type GearStats } from '../../../lib/constants/game-config';

type ShopItem = Database['public']['Tables']['shop_items']['Row'];

/** Premium item of the month (claim_monthly_item): what the shop banner shows. */
export interface MonthlyItemState {
  item: ShopItem | null;
  month: string | null;
  /** Owned by the player (received this month or before). */
  owned: boolean;
  /** Just received on this visit: the shop says so once. */
  justGranted: boolean;
}

interface ShopState {
  items: ShopItem[];
  ownedItemIds: string[];
  monthly: MonthlyItemState;
  equippedSlots: Record<string, { itemId: string; item?: ShopItem }>;
  isLoading: boolean;
  activeCategory: string;
}

const initialState = (): ShopState => ({
  items: [],
  ownedItemIds: [] as string[],
  monthly: { item: null, month: null, owned: false, justGranted: false },
  equippedSlots: {},
  isLoading: false,
  activeCategory: 'avatar_hat',
});

export const shopStore$ = observable<ShopState>(initialState());

resetOnSignOut(shopStore$, initialState);

syncObservable(shopStore$, {
  persist: {
    name: 'habitquest_shop',
    plugin: persistPlugin,
  },
});

export async function fetchShop() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  shopStore$.isLoading.set(true);
  try {
    // Premium players receive the item of the month (server-side, once).
    const { data: claim } = await supabase.rpc('claim_monthly_item');
    const monthly = (claim ?? null) as { granted?: boolean; reason?: string; item_id?: string; month?: string } | null;

    // Fetch user's purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select('item_id')
      .eq('user_id', userId);

    const ownedIds = (purchases ?? []).map((p) => p.item_id);
    shopStore$.ownedItemIds.set(ownedIds);

    // Items for sale, plus owned items that are not sold (items of the month).
    const notSold = ownedIds.filter(Boolean);
    const query = supabase.from('shop_items').select('*');
    const { data: items } = await (notSold.length
      ? query.or(`is_available.eq.true,id.in.(${notSold.join(',')})`)
      : query.eq('is_available', true)
    ).order('price_gold', { ascending: true });

    shopStore$.items.set(items ?? []);

    let monthlyItem = (items ?? []).find((i) => i.id === monthly?.item_id) ?? null;
    if (monthly?.item_id && !monthlyItem) {
      const { data } = await supabase.from('shop_items').select('*').eq('id', monthly.item_id).maybeSingle();
      monthlyItem = data ?? null;
    }
    shopStore$.monthly.set({
      item: monthlyItem,
      month: monthly?.month ?? null,
      owned: !!monthly?.item_id && ownedIds.includes(monthly.item_id),
      justGranted: !!monthly?.granted,
    });

    // Fetch equipped items
    const { data: equipped } = await supabase
      .from('equipped_items')
      .select('*, item:shop_items(*)')
      .eq('user_id', userId);

    const slots: Record<string, { itemId: string; item?: ShopItem }> = {};
    (equipped ?? []).forEach((e: any) => {
      slots[e.slot] = { itemId: e.item_id, item: e.item };
    });
    shopStore$.equippedSlots.set(slots);
  } finally {
    shopStore$.isLoading.set(false);
  }
}

export async function purchaseItem(itemId: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { data, error } = await supabase.rpc('purchase_item', {
    p_user_id: userId,
    p_item_id: itemId,
  });

  if (error) throw error;

  const result = data as unknown as { success: boolean; error?: string; gold_remaining?: number };
  if (!result.success) {
    throw new Error(result.error ?? 'Purchase failed');
  }

  // Refresh shop and profile data
  await fetchShop();
  refreshProfile();
  checkAndUnlockAchievements().catch(() => {});
}

export async function equipItem(itemId: string, slot: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  // Upsert equipped item for this slot
  const { error } = await supabase
    .from('equipped_items')
    .upsert(
      { user_id: userId, item_id: itemId, slot },
      { onConflict: 'user_id,slot' },
    );

  if (error) throw error;
  await fetchShop();
  // Fully Equipped (4 slots).
  checkAndUnlockAchievements().catch(() => {});
}

export async function unequipSlot(slot: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('equipped_items')
    .delete()
    .eq('user_id', userId)
    .eq('slot', slot);

  if (error) throw error;
  await fetchShop();
}

/** Sprite keys a player wears, by slot (equipment is publicly readable, for friend profiles). */
export type Equipment = Partial<Record<'hat' | 'outfit' | 'accessory' | 'background', string>>;

export async function fetchEquipmentOf(userId: string): Promise<Equipment> {
  const { data } = await supabase
    .from('equipped_items')
    .select('slot, item:shop_items(sprite_key)')
    .eq('user_id', userId);

  const gear: Equipment = {};
  (data ?? []).forEach((e: any) => {
    if (e.item?.sprite_key) gear[e.slot as keyof Equipment] = e.item.sprite_key;
  });
  return gear;
}

/** Combat points of a player's equipment (ADR 017); the server uses the same rule in arenas. */
export async function fetchGearStatsOf(userId: string): Promise<GearStats> {
  const { data } = await supabase
    .from('equipped_items')
    .select('item:shop_items(category, rarity)')
    .eq('user_id', userId);
  return gearStats(
    (data ?? [])
      .map((e: any) => e.item)
      .filter((i: any): i is { category: string; rarity: string } => !!i?.category && !!i?.rarity),
  );
}

/** Combat points of the signed-in player's equipment. */
export function myGearStats(): GearStats {
  const slots = shopStore$.equippedSlots.get();
  return gearStats(
    Object.values(slots)
      .map((s) => s.item)
      .filter((i): i is ShopItem => !!i),
  );
}

/** Saves the app theme on the profile (the server checks it is owned). */
export async function setActiveTheme(themeKey: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('profiles')
    .update({ active_theme: themeKey })
    .eq('id', userId);

  if (error) throw error;
}

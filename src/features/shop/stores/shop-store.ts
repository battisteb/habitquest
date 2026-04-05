import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import type { Database } from '../../../lib/supabase/types';

type ShopItem = Database['public']['Tables']['shop_items']['Row'];

interface ShopState {
  items: ShopItem[];
  ownedItemIds: Set<string>;
  equippedSlots: Record<string, { itemId: string; item?: ShopItem }>;
  isLoading: boolean;
  activeCategory: string;
}

export const shopStore$ = observable<ShopState>({
  items: [],
  ownedItemIds: new Set(),
  equippedSlots: {},
  isLoading: false,
  activeCategory: 'avatar_hat',
});

export async function fetchShop() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  shopStore$.isLoading.set(true);
  try {
    // Fetch all available items
    const { data: items } = await supabase
      .from('shop_items')
      .select('*')
      .eq('is_available', true)
      .order('price_gold', { ascending: true });

    shopStore$.items.set(items ?? []);

    // Fetch user's purchases
    const { data: purchases } = await supabase
      .from('purchases')
      .select('item_id')
      .eq('user_id', userId);

    const ownedIds = new Set((purchases ?? []).map((p) => p.item_id));
    shopStore$.ownedItemIds.set(ownedIds);

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

  const { data, error } = await supabase.rpc('purchase_item' as never, {
    p_user_id: userId,
    p_item_id: itemId,
  } as never);

  if (error) throw error;

  const result = data as unknown as { success: boolean; error?: string; gold_remaining?: number };
  if (!result.success) {
    throw new Error(result.error ?? 'Purchase failed');
  }

  // Refresh shop and profile data
  await fetchShop();
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

export async function setActiveTheme(themeKey: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { error } = await supabase
    .from('profiles')
    .update({ active_theme: themeKey })
    .eq('id', userId);

  if (error) throw error;
}

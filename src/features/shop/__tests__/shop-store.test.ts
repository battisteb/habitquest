/**
 * Shop store: purchases go through the purchase_item RPC, equipment is one row
 * per slot, and a friend's equipment is read by slot for their profile.
 * Server-side rules (ownership, Premium rarities) are in supabase/tests/shop.test.sql.
 */

const mockRpc = jest.fn();
const mockUpsert = jest.fn();
const mockTables: Record<string, unknown[]> = {};

function mockQuery(table: string) {
  const result = { data: mockTables[table] ?? [], error: null };
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    or: jest.fn(() => chain),
    order: jest.fn(() => chain),
    maybeSingle: jest.fn(() => Promise.resolve({ data: (mockTables[table] ?? [])[0] ?? null, error: null })),
    delete: jest.fn(() => chain),
    upsert: (...args: unknown[]) => {
      mockUpsert(table, ...args);
      return Promise.resolve({ error: null });
    },
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args), from: (t: string) => mockQuery(t) },
}));
jest.mock('../../auth/stores/auth-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { authStore$: observable({ user: { id: 'me' } }) };
});
jest.mock('../../gamification/stores/profile-store', () => ({ refreshProfile: jest.fn() }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

import { purchaseItem, equipItem, fetchEquipmentOf, fetchShop, shopStore$ } from '../stores/shop-store';

describe('shop store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const k of Object.keys(mockTables)) delete mockTables[k];
  });

  it('buys through the server and refreshes what the player owns', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, gold_remaining: 40 }, error: null });
    mockTables.purchases = [{ item_id: 'hat-1' }];
    await purchaseItem('hat-1');
    expect(mockRpc).toHaveBeenCalledWith('purchase_item', { p_user_id: 'me', p_item_id: 'hat-1' });
    expect(shopStore$.ownedItemIds.peek()).toEqual(['hat-1']);
  });

  it('surfaces the server refusal (e.g. Premium required)', async () => {
    mockRpc.mockResolvedValue({ data: { success: false, error: 'Premium required' }, error: null });
    await expect(purchaseItem('crown')).rejects.toThrow('Premium required');
  });

  it('equips one item per slot', async () => {
    await equipItem('hat-1', 'hat');
    expect(mockUpsert).toHaveBeenCalledWith(
      'equipped_items',
      { user_id: 'me', item_id: 'hat-1', slot: 'hat' },
      { onConflict: 'user_id,slot' },
    );
  });

  it('keeps the equipped item of each slot after a refresh', async () => {
    mockTables.equipped_items = [{ slot: 'hat', item_id: 'hat-1', item: { id: 'hat-1', sprite_key: 'knight_helm' } }];
    await fetchShop();
    expect(shopStore$.equippedSlots.peek().hat.item?.sprite_key).toBe('knight_helm');
  });

  it('hands the item of the month to Premium players and says so once', async () => {
    mockRpc.mockResolvedValue({ data: { granted: true, item_id: 'pumpkin', month: '2026-10-01' }, error: null });
    mockTables.purchases = [{ item_id: 'pumpkin' }];
    mockTables.shop_items = [{ id: 'pumpkin', name: 'Pumpkin Hat', category: 'avatar_hat', sprite_key: 'hat_pumpkin' }];
    await fetchShop();
    expect(mockRpc).toHaveBeenCalledWith('claim_monthly_item');
    const monthly = shopStore$.monthly.peek();
    expect(monthly.item?.sprite_key).toBe('hat_pumpkin');
    expect(monthly.owned).toBe(true);
    expect(monthly.justGranted).toBe(true);
  });

  it('shows the item of the month to free players without giving it', async () => {
    mockRpc.mockResolvedValue({ data: { granted: false, reason: 'not_premium', item_id: 'pumpkin', month: '2026-10-01' }, error: null });
    mockTables.purchases = [];
    mockTables.shop_items = [{ id: 'pumpkin', name: 'Pumpkin Hat', category: 'avatar_hat', sprite_key: 'hat_pumpkin' }];
    await fetchShop();
    const monthly = shopStore$.monthly.peek();
    expect(monthly.item?.id).toBe('pumpkin');
    expect(monthly.owned).toBe(false);
    expect(monthly.justGranted).toBe(false);
  });

  it("reads a friend's equipment by slot", async () => {
    mockTables.equipped_items = [
      { slot: 'hat', item: { sprite_key: 'wizard_hat' } },
      { slot: 'accessory', item: { sprite_key: 'cape' } },
      { slot: 'outfit', item: null },
    ];
    await expect(fetchEquipmentOf('friend')).resolves.toEqual({ hat: 'wizard_hat', accessory: 'cape' });
  });
});

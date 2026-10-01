/**
 * Duel store: a friend duel is recorded before the fight, its result is saved
 * by the challenger and the reward shown is the one the server paid.
 * Server-side rules are in supabase/tests/duels.test.sql.
 */

const mockRpc = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();

function mockQuery() {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    or: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    neq: jest.fn(() => chain),
    order: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve({ data: { id: 'duel-1' }, error: null })),
    insert: (row: unknown) => {
      mockInsert(row);
      return chain;
    },
    update: (row: unknown) => {
      mockUpdate(row);
      return chain;
    },
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [], count: 0, error: null }).then(resolve),
  };
  return chain;
}

jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args), from: () => mockQuery() },
}));
jest.mock('../../auth/stores/auth-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { authStore$: observable({ user: { id: 'me' } }) };
});
jest.mock('../../monetization/stores/subscription-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { subscriptionStore$: observable({ isPremium: false }) };
});

import { createDuel, resolveDuel } from '../stores/duel-store';

describe('duel store', () => {
  beforeEach(() => jest.clearAllMocks());

  it('records the duel before the fight and returns its id', async () => {
    await expect(createDuel('friend', 'balanced_attack')).resolves.toBe('duel-1');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ challenger_id: 'me', opponent_id: 'friend', status: 'pending' }),
    );
  });

  it('saves a win and shows the gold the server paid', async () => {
    mockRpc.mockResolvedValueOnce({ data: { success: true, gold: 30, xp: 0 } });
    await expect(resolveDuel('duel-1', 'me')).resolves.toEqual({ gold: 30, xp: 0 });
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'resolved', winner_id: 'me' });
    expect(mockRpc).toHaveBeenCalledWith('claim_duel_reward', { p_duel_id: 'duel-1' });
  });

  it('shows nothing when the server pays nothing', async () => {
    mockRpc.mockResolvedValueOnce({ data: { success: false, reason: 'already_claimed' } });
    await expect(resolveDuel('duel-1', 'friend')).resolves.toEqual({ gold: 0, xp: 0 });
  });

  it('closes a draw without a winner or a reward', async () => {
    await expect(resolveDuel('duel-1', null)).resolves.toEqual({ gold: 0, xp: 0 });
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'resolved', winner_id: null });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

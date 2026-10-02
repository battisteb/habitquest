/**
 * Duel store: a friendly duel is recorded before the fight and its result is
 * saved by the challenger; friendly duels pay nothing.
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

  it('saves the result of a friendly duel and pays nothing', async () => {
    await expect(resolveDuel('duel-1', 'me')).resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'resolved', winner_id: 'me' });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('closes a draw without a winner', async () => {
    await resolveDuel('duel-1', null);
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'resolved', winner_id: null });
    expect(mockRpc).not.toHaveBeenCalled();
  });
});

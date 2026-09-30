/**
 * Friend requests: server rules are in supabase/tests/friendships.test.sql.
 */
const mockCalls: { table: string; op: string; payload?: unknown }[] = [];

function mockQuery(table: string) {
  const chain: any = {
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    single: jest.fn(() => Promise.resolve({ data: { requester_id: 'them' }, error: null })),
    insert: (payload: unknown) => {
      mockCalls.push({ table, op: 'insert', payload });
      return Promise.resolve({ error: null });
    },
    update: (payload: unknown) => {
      mockCalls.push({ table, op: 'update', payload });
      return chain;
    },
    then: (resolve: (v: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
  };
  return chain;
}

jest.mock('../../../lib/supabase/client', () => ({
  supabase: { from: (t: string) => mockQuery(t), rpc: jest.fn(() => Promise.resolve({ error: null })) },
}));
jest.mock('../../auth/stores/auth-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { authStore$: observable({ user: { id: 'me' } }) };
});
jest.mock('../../gamification/stores/profile-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { profileStore$: observable({ profile: { username: 'me' } }) };
});
jest.mock('../../gamification/stores/achievements-store', () => ({
  checkAndUnlockAchievements: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

import { friendsStore$, sendFriendRequest } from '../stores/friends-store';

describe('sendFriendRequest', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    friendsStore$.pendingReceived.set([]);
  });

  it('sends a pending request', async () => {
    await sendFriendRequest('them');
    expect(mockCalls).toContainEqual({ table: 'friendships', op: 'insert', payload: { requester_id: 'me', addressee_id: 'them' } });
  });

  it('accepts their request instead when they already asked', async () => {
    friendsStore$.pendingReceived.set([
      { id: 'f1', requester_id: 'them', addressee_id: 'me', status: 'pending', created_at: '', profile: {} as never },
    ]);
    await sendFriendRequest('them');
    expect(mockCalls.find((c) => c.op === 'insert')).toBeUndefined();
    expect(mockCalls).toContainEqual({ table: 'friendships', op: 'update', payload: { status: 'accepted' } });
  });
});

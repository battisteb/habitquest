const mockCalls: string[] = [];
const mockRpc = jest.fn();
const mockChallenges: unknown[] = [];

jest.mock('../../../lib/supabase/client', () => {
  const selectChain = {
    or: () => selectChain,
    eq: () => Promise.resolve({ data: mockChallenges }),
  };
  return {
    supabase: {
      from: () => ({
        select: () => selectChain,
        update: (values: Record<string, unknown>) => ({
          eq: () => {
            mockCalls.push(`update:${values.status ?? 'progress'}`);
            return Promise.resolve({ error: null });
          },
        }),
      }),
      rpc: (name: string, args: unknown) => {
        mockCalls.push(`rpc:${name}`);
        return mockRpc(name, args);
      },
    },
  };
});

jest.mock('../../auth/stores/auth-store', () => ({
  authStore$: { user: { get: () => ({ id: 'me' }) } },
}));

import { challengesStore$, updateChallengeProgress } from '../stores/challenges-store';

function challenge(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    type: 'completion_count',
    target: 3,
    creator_id: 'me',
    creator_progress: 2,
    opponent_id: 'rival',
    opponent_progress: 0,
    gold_wager: 20,
    ...overrides,
  };
}

describe('updateChallengeProgress', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    mockChallenges.length = 0;
    mockRpc.mockReset();
    mockRpc.mockImplementation((name: string) =>
      Promise.resolve({ data: name === 'settle_challenge_wager' ? 20 : null, error: null }),
    );
    challengesStore$.active.set([{ id: 'c1' }] as never);
  });

  it('completes the challenge before collecting the wager, then notifies', async () => {
    mockChallenges.push(challenge());

    await updateChallengeProgress('me', 10, 1);

    expect(mockCalls).toEqual([
      'update:completed',
      'rpc:settle_challenge_wager',
      'rpc:create_notification',
      'rpc:create_notification',
    ]);
    expect(mockRpc).toHaveBeenCalledWith('settle_challenge_wager', { p_challenge_id: 'c1' });
    expect(mockCalls).not.toContain('rpc:add_gold');
  });

  it('only records progress when the target is not reached', async () => {
    mockChallenges.push(challenge({ creator_progress: 0 }));

    await updateChallengeProgress('me', 10, 1);

    expect(mockCalls).toEqual(['update:progress']);
  });

  it('does not claim a win the opponent already has', async () => {
    mockChallenges.push(challenge({ opponent_progress: 3 }));

    await updateChallengeProgress('me', 10, 1);

    expect(mockCalls).toEqual(['update:progress']);
  });
});

/**
 * Achievements come from the check_achievements RPC (progress + unlocks are
 * computed by the server, see supabase/tests/achievements.test.sql).
 */
const mockRpc = jest.fn();

jest.mock('../../../lib/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock('../../auth/stores/auth-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { authStore$: observable({ user: { id: 'me' } }) };
});
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

import { achievementsStore$, checkAndUnlockAchievements, fetchAchievements } from '../stores/achievements-store';

const row = (id: string, key: string, unlocked: boolean, value: number) => ({
  id, key, name: key, description: '', category: 'social', icon: '🏅', threshold: 1,
  xp_reward: 10, gold_reward: 5, created_at: '', is_unlocked: unlocked, unlocked_at: unlocked ? 'now' : null,
  current_value: value,
});

describe('achievements store', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    achievementsStore$.newlyUnlocked.set([]);
  });

  it('shows progress from the server', async () => {
    mockRpc.mockResolvedValue({ data: { new: [], achievements: [row('a1', 'friend_5', false, 1)] }, error: null });
    await fetchAchievements();
    const [a] = achievementsStore$.achievements.peek();
    expect(a).toMatchObject({ key: 'friend_5', isUnlocked: false, currentValue: 1 });
    expect(achievementsStore$.newlyUnlocked.peek()).toEqual([]);
  });

  it('raises a toast only for achievements unlocked by this check', async () => {
    mockRpc.mockResolvedValue({
      data: { new: ['a2'], achievements: [row('a1', 'friend_1', true, 1), row('a2', 'buy_1', true, 1)] },
      error: null,
    });
    await checkAndUnlockAchievements();
    expect(mockRpc).toHaveBeenCalledWith('check_achievements');
    expect(achievementsStore$.newlyUnlocked.peek().map((a) => a.key)).toEqual(['buy_1']);
  });
});

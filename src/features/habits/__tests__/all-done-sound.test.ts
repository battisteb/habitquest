/**
 * The last quest of the day plays a short fanfare after the completion sound,
 * unless a level-up already celebrates.
 */
const mockPlaySfx = jest.fn(() => Promise.resolve());
const mockRpc = jest.fn();

jest.mock('../../../lib/audio/sound-service', () => ({ playSfx: (...args: unknown[]) => mockPlaySfx(...(args as [])) }));
jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args), from: jest.fn() },
}));
jest.mock('../../auth/stores/auth-store', () => ({ authStore$: { user: { get: () => ({ id: 'me' }) } } }));
jest.mock('../../gamification/stores/profile-store', () => ({ refreshProfile: jest.fn() }));

import { habitsStore$, completeHabit, pendingHabitCount } from '../stores/habits-store';

const habit = (id: string) => ({
  id,
  user_id: 'me',
  name: id,
  category: 'health',
  frequency: 'daily',
  is_archived: false,
  is_paused: false,
  paused_at: null,
  content: null,
  emoji: null,
  days: null,
  why: null,
  anchor: null,
  created_at: new Date().toISOString(),
});

const serverResult = (levels: [number, number]) => ({
  data: {
    success: true, xp_earned: 10, gold_earned: 0, old_level: levels[0], new_level: levels[1],
    current_streak: 2, longest_streak: 2, previous_streak: 1,
  },
  error: null,
});

describe('all quests done sound', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPlaySfx.mockClear();
    habitsStore$.habits.set([habit('a'), habit('b')]);
    habitsStore$.todayCompletions.set({ a: true });
    habitsStore$.weekCompletions.set({});
    habitsStore$.streaks.set({});
  });
  afterEach(() => jest.useRealTimers());

  it('counts the quests still to do today', () => {
    expect(pendingHabitCount()).toBe(1);
  });

  it('plays the fanfare when the last quest is checked off', async () => {
    mockRpc.mockResolvedValueOnce(serverResult([2, 2]));
    await completeHabit('b');
    jest.advanceTimersByTime(500);
    expect(mockPlaySfx).toHaveBeenCalledWith('complete', 0.6);
    expect(mockPlaySfx).toHaveBeenCalledWith('all_done', 0.8);
  });

  it('stays quiet while quests remain', async () => {
    habitsStore$.habits.set([habit('a'), habit('b'), habit('c')]);
    mockRpc.mockResolvedValueOnce(serverResult([2, 2]));
    await completeHabit('b');
    jest.advanceTimersByTime(500);
    expect(mockPlaySfx).not.toHaveBeenCalledWith('all_done', expect.anything());
  });

  it('lets a level-up celebrate instead', async () => {
    mockRpc.mockResolvedValueOnce(serverResult([2, 3]));
    await completeHabit('b');
    jest.advanceTimersByTime(500);
    expect(mockPlaySfx).not.toHaveBeenCalledWith('all_done', expect.anything());
  });
});

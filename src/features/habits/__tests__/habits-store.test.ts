import { habitsStore$ } from '../stores/habits-store';

// Mock supabase
const mockSelect = jest.fn().mockReturnThis();
const mockInsert = jest.fn().mockReturnThis();
const mockUpdate = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockIn = jest.fn().mockReturnThis();
const mockGte = jest.fn().mockResolvedValue({ data: [] });
const mockOrder = jest.fn().mockResolvedValue({ data: [] });
const mockSingle = jest.fn().mockResolvedValue({ data: { id: 'habit-1' }, error: null });

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      eq: mockEq,
      in: mockIn,
      gte: mockGte,
      order: mockOrder,
      single: mockSingle,
    })),
    rpc: jest.fn().mockResolvedValue({ error: null }),
  },
}));

jest.mock('../../auth/stores/auth-store', () => ({
  authStore$: {
    user: { get: () => ({ id: 'user-123' }) },
  },
}));

describe('habitsStore$', () => {
  beforeEach(() => {
    habitsStore$.habits.set([]);
    habitsStore$.streaks.set({});
    habitsStore$.todayCompletions.set({});
    habitsStore$.isLoading.set(false);
  });

  it('starts with empty habits', () => {
    expect(habitsStore$.habits.get()).toEqual([]);
  });

  it('starts with empty streaks', () => {
    expect(habitsStore$.streaks.get()).toEqual({});
  });

  it('starts with empty todayCompletions', () => {
    expect(habitsStore$.todayCompletions.get()).toEqual({});
  });

  it('tracks loading state', () => {
    expect(habitsStore$.isLoading.get()).toBe(false);
    habitsStore$.isLoading.set(true);
    expect(habitsStore$.isLoading.get()).toBe(true);
  });

  it('completeHabit optimistically updates todayCompletions', async () => {
    habitsStore$.habits.set([
      {
        id: 'h1',
        user_id: 'user-123',
        name: 'Run',
        category: 'sport',
        frequency: 'daily',
        is_archived: false,
        is_paused: false,
        paused_at: null,
        content: null,
        emoji: null,
        days: null,
        created_at: new Date().toISOString(),
      },
    ]);
    habitsStore$.streaks.set({
      h1: {
        id: 's1',
        habit_id: 'h1', broken_at: null, broken_count: 0, broken_last_day: null,
        current_count: 3,
        longest_count: 5,
        last_completed_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      },
    });

    const { supabase } = require('../../../lib/supabase/client');
    supabase.rpc.mockResolvedValueOnce({
      data: {
        success: true,
        xp_earned: 14,
        gold_earned: 1,
        old_level: 0,
        new_level: 0,
        current_streak: 4,
        longest_streak: 5,
        previous_streak: 3,
      },
      error: null,
    });

    const { completeHabit } = require('../stores/habits-store');
    await completeHabit('h1', 'felt good');

    expect(supabase.rpc).toHaveBeenCalledWith('complete_habit', { p_habit_id: 'h1', p_note: 'felt good' });
    expect(habitsStore$.todayCompletions.get()['h1']).toBe(true);
    expect(habitsStore$.streaks.get()['h1'].current_count).toBe(4);
  });

  it('completeHabit trusts the server when it refuses a duplicate', async () => {
    habitsStore$.habits.set([
      {
        id: 'h1', user_id: 'user-123', name: 'Run', category: 'sport', frequency: 'daily',
        is_archived: false, is_paused: false, paused_at: null, content: null, emoji: null, days: null,
        created_at: new Date().toISOString(),
      },
    ]);
    habitsStore$.streaks.set({
      h1: { id: 's1', habit_id: 'h1', broken_at: null, broken_count: 0, broken_last_day: null, current_count: 3, longest_count: 5, last_completed_at: null },
    });

    const { supabase } = require('../../../lib/supabase/client');
    supabase.rpc.mockResolvedValueOnce({ data: { success: false, reason: 'already_completed' }, error: null });

    const { completeHabit } = require('../stores/habits-store');
    await completeHabit('h1');

    expect(habitsStore$.todayCompletions.get()['h1']).toBe(true);
    expect(habitsStore$.streaks.get()['h1'].current_count).toBe(3);
  });

  it('completeHabit does nothing if already completed today', async () => {
    habitsStore$.todayCompletions.set({ h1: true });

    const { supabase } = require('../../../lib/supabase/client');
    const fromSpy = supabase.from;
    fromSpy.mockClear();
    supabase.rpc.mockClear();

    const { completeHabit } = require('../stores/habits-store');
    await completeHabit('h1');

    // Should not have called supabase
    expect(fromSpy).not.toHaveBeenCalled();
    expect(supabase.rpc).not.toHaveBeenCalledWith('complete_habit', expect.anything());
  });

  describe('uncompleteHabit (validation tapped by mistake)', () => {
    beforeEach(() => {
      habitsStore$.todayCompletions.set({ h1: true });
      habitsStore$.weekCompletions.set({ h1: 2 });
      habitsStore$.streaks.set({
        h1: { id: 's1', habit_id: 'h1', broken_at: null, broken_count: 0, broken_last_day: null, current_count: 4, longest_count: 5, last_completed_at: new Date().toISOString() },
      });
    });

    it('asks the server to take everything back and mirrors it', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockResolvedValueOnce({
        data: { success: true, xp_lost: 14, gold_lost: 1, old_level: 2, new_level: 2, current_streak: 3 },
        error: null,
      });
      const { uncompleteHabit } = require('../stores/habits-store');
      const result = await uncompleteHabit('h1');

      expect(supabase.rpc).toHaveBeenCalledWith('uncomplete_habit', { p_habit_id: 'h1' });
      expect(result.xp_lost).toBe(14);
      expect(habitsStore$.todayCompletions.get()['h1']).toBe(false);
      expect(habitsStore$.weekCompletions.get()['h1']).toBe(1);
      expect(habitsStore$.streaks.get()['h1'].current_count).toBe(3);
    });

    it('does nothing for a quest not validated today', async () => {
      habitsStore$.todayCompletions.set({});
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockClear();
      const { uncompleteHabit } = require('../stores/habits-store');
      expect(await uncompleteHabit('h1')).toBeUndefined();
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it('trusts the server when there is nothing to undo', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockResolvedValueOnce({ data: { success: false, reason: 'not_completed_today' }, error: null });
      const { uncompleteHabit } = require('../stores/habits-store');
      expect(await uncompleteHabit('h1')).toBeUndefined();
      expect(habitsStore$.todayCompletions.get()['h1']).toBe(false);
      expect(habitsStore$.streaks.get()['h1'].current_count).toBe(4);
    });
  });

  describe('repairStreak (ADR 021)', () => {
    it('costs 3 gold per streak day, between 15 and 150', () => {
      const { streakRepairCost } = require('../../../lib/constants/game-config');
      expect(streakRepairCost(2)).toBe(15);
      expect(streakRepairCost(12)).toBe(36);
      expect(streakRepairCost(80)).toBe(150);
    });

    it('puts the streak back when the server agrees', async () => {
      habitsStore$.streaks.set({
        h1: { id: 's1', habit_id: 'h1', broken_at: null, broken_count: 0, broken_last_day: null, current_count: 0, longest_count: 12, last_completed_at: null },
      });
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockResolvedValueOnce({ data: { success: true, cost: 36, current_streak: 12 }, error: null });
      const { repairStreak } = require('../stores/habits-store');
      const result = await repairStreak('h1');
      expect(supabase.rpc).toHaveBeenCalledWith('repair_streak', { p_habit_id: 'h1', p_with_ad: false });
      expect(result.success).toBe(true);
      expect(habitsStore$.streaks.get()['h1'].current_count).toBe(12);
    });

    it('changes nothing when the player lacks gold', async () => {
      habitsStore$.streaks.set({
        h1: { id: 's1', habit_id: 'h1', broken_at: null, broken_count: 0, broken_last_day: null, current_count: 0, longest_count: 12, last_completed_at: null },
      });
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockResolvedValueOnce({ data: { success: false, reason: 'not_enough_gold', cost: 36 }, error: null });
      const { repairStreak } = require('../stores/habits-store');
      expect((await repairStreak('h1')).reason).toBe('not_enough_gold');
      expect(habitsStore$.streaks.get()['h1'].current_count).toBe(0);
    });
  });

  describe('3 times a week', () => {
    const weekly = {
      id: 'w1', user_id: 'user-123', name: 'Gym', category: 'fitness', frequency: '3x_week',
      is_archived: false, is_paused: false, paused_at: null, content: null, emoji: null, days: null,
      created_at: new Date().toISOString(),
    };

    beforeEach(() => {
      habitsStore$.habits.set([weekly]);
      habitsStore$.weekCompletions.set({});
    });

    it('counts as done for today once validated today, even below the weekly target', () => {
      const { isHabitCompletedEnough } = require('../stores/habits-store');
      habitsStore$.weekCompletions.set({ w1: 1 });
      expect(isHabitCompletedEnough('w1')).toBe(false);
      habitsStore$.todayCompletions.set({ w1: true });
      expect(isHabitCompletedEnough('w1')).toBe(true);
    });

    it('is not sent to the server a second time the same day', async () => {
      habitsStore$.todayCompletions.set({ w1: true });
      habitsStore$.weekCompletions.set({ w1: 1 });
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockClear();
      const { completeHabit } = require('../stores/habits-store');
      await completeHabit('w1');
      expect(supabase.rpc).not.toHaveBeenCalled();
    });
  });
});

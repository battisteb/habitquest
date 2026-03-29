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
        created_at: new Date().toISOString(),
      },
    ]);
    habitsStore$.streaks.set({
      h1: {
        id: 's1',
        habit_id: 'h1',
        current_count: 3,
        longest_count: 5,
        last_completed_at: new Date(Date.now() - 86400000).toISOString(), // yesterday
      },
    });

    const { completeHabit } = require('../stores/habits-store');
    await completeHabit('h1');

    expect(habitsStore$.todayCompletions.get()['h1']).toBe(true);
    expect(habitsStore$.streaks.get()['h1'].current_count).toBe(4);
  });

  it('completeHabit does nothing if already completed today', async () => {
    habitsStore$.todayCompletions.set({ h1: true });

    const { supabase } = require('../../../lib/supabase/client');
    const fromSpy = supabase.from;
    fromSpy.mockClear();

    const { completeHabit } = require('../stores/habits-store');
    await completeHabit('h1');

    // Should not have called supabase
    expect(fromSpy).not.toHaveBeenCalled();
  });
});

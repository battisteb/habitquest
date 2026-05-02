import { reportBrokenStreaks, dismissBrokenStreak, clearBrokenStreakForHabit, brokenStreakStore$ } from '../stores/broken-streak-store';

const mockStorage: Record<string, string> = {};
jest.mock('../../../lib/storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorage[key] ?? undefined,
    set: (key: string, val: string) => { mockStorage[key] = val; },
    delete: (key: string) => { delete mockStorage[key]; },
  },
}));

describe('broken-streak-store', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    brokenStreakStore$.items.set([]);
  });

  it('reports broken streaks as visible items', () => {
    reportBrokenStreaks([{ habitId: 'h1', habitName: 'Run', wasCount: 7 }]);
    expect(brokenStreakStore$.items.get()).toHaveLength(1);
    expect(brokenStreakStore$.items.get()[0].wasCount).toBe(7);
  });

  it('dismisses a broken streak by id', () => {
    reportBrokenStreaks([
      { habitId: 'h1', habitName: 'Run', wasCount: 7 },
      { habitId: 'h2', habitName: 'Read', wasCount: 3 },
    ]);
    dismissBrokenStreak('h1');
    const items = brokenStreakStore$.items.get();
    expect(items).toHaveLength(1);
    expect(items[0].habitId).toBe('h2');
  });

  it('does not re-show dismissed streaks when reported again', () => {
    reportBrokenStreaks([{ habitId: 'h1', habitName: 'Run', wasCount: 7 }]);
    dismissBrokenStreak('h1');
    reportBrokenStreaks([{ habitId: 'h1', habitName: 'Run', wasCount: 7 }]);
    expect(brokenStreakStore$.items.get()).toHaveLength(0);
  });

  it('clears a broken streak on habit completion', () => {
    reportBrokenStreaks([{ habitId: 'h1', habitName: 'Run', wasCount: 7 }]);
    clearBrokenStreakForHabit('h1');
    expect(brokenStreakStore$.items.get()).toHaveLength(0);
  });
});

import { pinnedHabitsStore$, togglePinHabit, isHabitPinned } from '../stores/pinned-habits-store';

jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: {} }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

describe('pinned-habits-store', () => {
  beforeEach(() => {
    pinnedHabitsStore$.pinnedIds.set([]);
  });

  it('pins a habit', () => {
    togglePinHabit('h1');
    expect(pinnedHabitsStore$.pinnedIds.get()).toContain('h1');
  });

  it('unpins an already-pinned habit', () => {
    togglePinHabit('h1');
    togglePinHabit('h1');
    expect(pinnedHabitsStore$.pinnedIds.get()).not.toContain('h1');
  });

  it('pins multiple habits independently', () => {
    togglePinHabit('h1');
    togglePinHabit('h2');
    expect(pinnedHabitsStore$.pinnedIds.get()).toEqual(['h1', 'h2']);
  });

  it('unpins one without affecting others', () => {
    togglePinHabit('h1');
    togglePinHabit('h2');
    togglePinHabit('h1');
    expect(pinnedHabitsStore$.pinnedIds.get()).toEqual(['h2']);
  });

  it('isHabitPinned returns correct status', () => {
    togglePinHabit('h1');
    expect(isHabitPinned('h1')).toBe(true);
    expect(isHabitPinned('h2')).toBe(false);
  });
});

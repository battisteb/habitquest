import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { persistPlugin } from '../../../lib/storage/persist';

interface PinnedHabitsState {
  pinnedIds: string[];
}

export const pinnedHabitsStore$ = observable<PinnedHabitsState>({ pinnedIds: [] });

syncObservable(pinnedHabitsStore$, {
  persist: {
    name: 'habitquest_pinned_habits',
    plugin: persistPlugin,
  },
});

export function togglePinHabit(habitId: string) {
  const current = pinnedHabitsStore$.pinnedIds.get();
  if (current.includes(habitId)) {
    pinnedHabitsStore$.pinnedIds.set(current.filter((id) => id !== habitId));
  } else {
    pinnedHabitsStore$.pinnedIds.set([...current, habitId]);
  }
}

export function isHabitPinned(habitId: string): boolean {
  return pinnedHabitsStore$.pinnedIds.get().includes(habitId);
}

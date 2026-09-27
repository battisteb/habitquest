import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { persistPlugin } from '../../../lib/storage/persist';
import { resetOnSignOut } from '../../../lib/storage/user-data';

interface PinnedHabitsState {
  pinnedIds: string[];
}

const initialState = (): PinnedHabitsState => ({ pinnedIds: [] });

export const pinnedHabitsStore$ = observable<PinnedHabitsState>(initialState());

resetOnSignOut(pinnedHabitsStore$, initialState);

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

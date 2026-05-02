import { observable } from '@legendapp/state';
import { storage } from '../../../lib/storage/mmkv';

interface BrokenStreak {
  habitId: string;
  habitName: string;
  wasCount: number;
}

interface BrokenStreakState {
  items: BrokenStreak[];
}

export const brokenStreakStore$ = observable<BrokenStreakState>({ items: [] });

const DISMISSED_KEY = 'broken-streak-dismissed';

function getDismissedToday(): Set<string> {
  const today = new Date().toISOString().slice(0, 10);
  const raw = storage.getString(DISMISSED_KEY);
  if (!raw) return new Set();
  try {
    const data: { date: string; ids: string[] } = JSON.parse(raw);
    if (data.date !== today) return new Set();
    return new Set(data.ids);
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  const today = new Date().toISOString().slice(0, 10);
  storage.set(DISMISSED_KEY, JSON.stringify({ date: today, ids: [...ids] }));
}

export function reportBrokenStreaks(broken: BrokenStreak[]) {
  const dismissed = getDismissedToday();
  const visible = broken.filter((b) => !dismissed.has(b.habitId));
  brokenStreakStore$.items.set(visible);
}

export function dismissBrokenStreak(habitId: string) {
  const dismissed = getDismissedToday();
  dismissed.add(habitId);
  saveDismissed(dismissed);
  brokenStreakStore$.items.set(
    brokenStreakStore$.items.get().filter((b) => b.habitId !== habitId),
  );
}

export function clearBrokenStreakForHabit(habitId: string) {
  brokenStreakStore$.items.set(
    brokenStreakStore$.items.get().filter((b) => b.habitId !== habitId),
  );
}

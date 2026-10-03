import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { localDateKey } from '../../../lib/local-date';
import { resetOnSignOut } from '../../../lib/storage/user-data';
import type { MoodLog } from '../utils/mood-insights';

interface MoodState {
  /** Mood logged today (1 to 5), null if not yet. */
  today: number | null;
  /** Local day `today` refers to, so a new day starts empty. */
  day: string | null;
}

const initial = (): MoodState => ({ today: null, day: null });
export const moodStore$ = observable<MoodState>(initial());
resetOnSignOut(moodStore$, initial);

/** Today's mood, or null (a mood from yesterday does not count). */
export function todayMood(): number | null {
  const { today, day } = moodStore$.get();
  return day === localDateKey() ? today : null;
}

/** Saves today's mood on the server (one per day, can be changed). */
export async function logMood(mood: number): Promise<void> {
  const previous = moodStore$.get();
  moodStore$.set({ today: mood, day: localDateKey() });
  const { error } = await supabase.rpc('log_mood', { p_mood: mood });
  if (error) {
    moodStore$.set(previous);
    throw error;
  }
}

/** Moods of the last `days` days, oldest first; also refreshes today's. */
export async function fetchMoods(days = 120): Promise<MoodLog[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('mood_logs')
    .select('day, mood')
    .gte('day', localDateKey(since))
    .order('day', { ascending: true });
  if (error || !data) return [];
  const today = data.find((m) => m.day === localDateKey());
  if (today) moodStore$.set({ today: today.mood, day: today.day });
  return data;
}

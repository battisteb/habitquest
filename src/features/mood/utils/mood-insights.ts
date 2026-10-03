import { dayKey, duePerDay, type StatsCompletion } from '../../stats/utils/stats-math';

/** Moods from 1 (bad) to 5 (great), shown as pixel faces. */
export const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄'] as const;

export interface MoodLog {
  day: string; // YYYY-MM-DD, the player's local day
  mood: number;
}

export interface MoodHabit {
  id: string;
  name: string;
  emoji?: string | null;
  frequency: string;
  days?: number[] | null;
}

export interface MoodInsight {
  habitId: string;
  name: string;
  emoji: string | null;
  /** Average mood on days the quest was done, minus days it was not (−4 to +4). */
  delta: number;
  daysDone: number;
  daysMissed: number;
}

/** Days needed on each side before a link is shown, and the smallest gap worth telling. */
export const MIN_DAYS_EACH = 4;
export const MIN_DELTA = 0.5;

const average = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Personal links between quests and mood: for every quest, the average mood
 * of the days it was done against the days it was due but not done. Only
 * clear links with enough days on both sides, strongest first.
 */
export function moodInsights(habits: MoodHabit[], completions: StatsCompletion[], moods: MoodLog[]): MoodInsight[] {
  const doneDays = new Map<string, Set<string>>();
  for (const c of completions) {
    const set = doneDays.get(c.habit_id) ?? new Set<string>();
    set.add(dayKey(new Date(c.completed_at)));
    doneDays.set(c.habit_id, set);
  }

  const out: MoodInsight[] = [];
  for (const h of habits) {
    const done: number[] = [];
    const missed: number[] = [];
    const days = doneDays.get(h.id) ?? new Set<string>();
    for (const m of moods) {
      if (days.has(m.day)) done.push(m.mood);
      else if (duePerDay(h.frequency, h.days, new Date(`${m.day}T12:00:00`)) > 0) missed.push(m.mood);
    }
    if (done.length < MIN_DAYS_EACH || missed.length < MIN_DAYS_EACH) continue;
    const delta = Math.round((average(done) - average(missed)) * 10) / 10;
    if (Math.abs(delta) < MIN_DELTA) continue;
    out.push({ habitId: h.id, name: h.name, emoji: h.emoji ?? null, delta, daysDone: done.length, daysMissed: missed.length });
  }
  return out.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

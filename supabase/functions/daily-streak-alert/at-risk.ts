// Who has a streak at risk tonight: pure logic, no Deno import, so Jest tests
// it (src/features/notifications/__tests__/streak-alert-at-risk.test.ts).

export interface AlertHabit {
  id: string;
  user_id: string;
  frequency: string;
  days: number[] | null;
  is_archived: boolean;
  is_paused: boolean;
  current_count: number;
}

export interface AlertProfile {
  id: string;
  timezone: string | null;
  language: string | null;
}

export interface AlertCompletion {
  habit_id: string;
  completed_at: string;
}

/** "YYYY-MM-DD" and ISO weekday (1 = Monday) of an instant in a time zone. */
export function localDay(at: Date, timeZone: string | null): { date: string; weekday: number } {
  let tz = timeZone || 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
  } catch {
    tz = 'UTC';
  }
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short',
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return { date: `${get('year')}-${get('month')}-${get('day')}`, weekday: weekdays.indexOf(get('weekday')) + 1 };
}

/**
 * Players with a daily or chosen-days quest due today (their local day), with
 * a running streak, not done yet today. "N times a week" quests are left out:
 * a day off does not put their streak at risk.
 */
export function usersAtRisk(
  habits: AlertHabit[],
  profiles: AlertProfile[],
  completions: AlertCompletion[],
  now: Date,
): Set<string> {
  const tzOf = new Map(profiles.map((p) => [p.id, p.timezone]));
  const doneDays = new Map<string, Set<string>>();
  const userOf = new Map(habits.map((h) => [h.id, h.user_id]));
  for (const c of completions) {
    const uid = userOf.get(c.habit_id);
    if (!uid) continue;
    const set = doneDays.get(c.habit_id) ?? new Set<string>();
    set.add(localDay(new Date(c.completed_at), tzOf.get(uid) ?? null).date);
    doneDays.set(c.habit_id, set);
  }

  const out = new Set<string>();
  for (const h of habits) {
    if (h.is_archived || h.is_paused || h.current_count <= 0) continue;
    if (h.frequency !== 'daily' && h.frequency !== 'days') continue;
    const today = localDay(now, tzOf.get(h.user_id) ?? null);
    if (h.frequency === 'days' && !(h.days ?? []).includes(today.weekday)) continue;
    if (doneDays.get(h.id)?.has(today.date)) continue;
    out.add(h.user_id);
  }
  return out;
}

export const ALERT_TEXT = {
  en: { title: '⚡ Streak at risk!', body: 'Complete your quests before midnight to keep your streak alive!' },
  fr: { title: '⚡ Série en danger !', body: 'Valide tes quêtes avant minuit pour garder ta série !' },
};

/**
 * Completion statistics, computed on the player's local days.
 *
 * A day's rate is "quests done / quests due": a daily quest is due once a
 * day, an "N times a week" quest N/7 of a time, and a quest counts only from
 * the day it was created and not while it is paused. A quest done more than
 * once in a day counts once. Rates are capped at 100 %.
 */

export interface StatsHabit {
  id: string;
  frequency: string;
  /** ISO weekdays of a chosen-days quest. */
  days?: number[] | null;
  created_at: string;
  is_paused?: boolean;
  paused_at?: string | null;
}

export interface StatsCompletion {
  habit_id: string;
  completed_at: string;
}

export interface DayRate {
  date: string; // YYYY-MM-DD, local
  done: number;
  due: number;
  /** 0-1, or null when nothing was due that day. */
  rate: number | null;
}

/** YYYY-MM-DD of a date in the device's timezone. */
export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

/** Monday of the week of `d` (local). */
export function weekStart(d: Date): Date {
  const day = d.getDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}

/** How many times a quest is due on one day (a chosen-days quest: 0 on its rest days). */
export function duePerDay(frequency: string, days?: number[] | null, date?: Date): number {
  if (frequency === 'days') {
    if (!date) return (days?.length ?? 7) / 7;
    const dow = date.getDay() === 0 ? 7 : date.getDay();
    return days?.includes(dow) ? 1 : 0;
  }
  const m = /^(\d)x_week$/.exec(frequency);
  return m ? Number(m[1]) / 7 : 1;
}

/** Rates of every day from `from` to `to` (inclusive, local days). */
export function dayRates(
  habits: StatsHabit[],
  completions: StatsCompletion[],
  from: Date,
  to: Date,
  habitId?: string,
): DayRate[] {
  const scope = habitId ? habits.filter((h) => h.id === habitId) : habits;
  const ids = new Set(scope.map((h) => h.id));
  const doneByDay = new Map<string, Set<string>>();
  for (const c of completions) {
    if (!ids.has(c.habit_id)) continue;
    const key = dayKey(new Date(c.completed_at));
    const set = doneByDay.get(key) ?? new Set<string>();
    set.add(c.habit_id);
    doneByDay.set(key, set);
  }
  const starts = scope.map((h) => ({
    h,
    from: dayKey(new Date(h.created_at)),
    pausedFrom: h.is_paused && h.paused_at ? dayKey(new Date(h.paused_at)) : null,
  }));

  const out: DayRate[] = [];
  for (let d = addDays(from, 0); d <= to; d = addDays(d, 1)) {
    const key = dayKey(d);
    let due = 0;
    for (const s of starts) {
      if (key < s.from) continue;
      if (s.pausedFrom && key >= s.pausedFrom) continue;
      due += duePerDay(s.h.frequency, s.h.days, d);
    }
    const done = doneByDay.get(key)?.size ?? 0;
    out.push({ date: key, done, due, rate: due > 0 ? Math.min(1, done / due) : done > 0 ? 1 : null });
  }
  return out;
}

/** Average rate of a list of days (days with nothing due are skipped), 0-1 or null. */
export function averageRate(days: DayRate[]): number | null {
  const rated = days.filter((d) => d.rate !== null);
  if (rated.length === 0) return null;
  return rated.reduce((s, d) => s + (d.rate as number), 0) / rated.length;
}

/** Color level 0-4 of a rate, for the pixel grid (-1: nothing due / outside). */
export function rateLevel(rate: number | null): number {
  if (rate === null) return -1;
  if (rate === 0) return 0;
  if (rate < 0.4) return 1;
  if (rate < 0.7) return 2;
  if (rate < 1) return 3;
  return 4;
}

/**
 * The last `weeks` weeks as columns of 7 days (Monday first), the current
 * week last; days after today are null.
 */
export function yearGrid(rates: Map<string, DayRate>, today: Date, weeks = 53): (DayRate | null)[][] {
  const first = addDays(weekStart(today), -7 * (weeks - 1));
  const todayKey = dayKey(today);
  const cols: (DayRate | null)[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: (DayRate | null)[] = [];
    for (let i = 0; i < 7; i++) {
      const key = dayKey(addDays(first, w * 7 + i));
      col.push(key > todayKey ? null : rates.get(key) ?? { date: key, done: 0, due: 0, rate: null });
    }
    cols.push(col);
  }
  return cols;
}

/**
 * Change of the average rate between the last 7 days and the 7 days before,
 * in percentage points, or null without data on both sides.
 */
export function weekOverWeek(rates: Map<string, DayRate>, today: Date): number | null {
  const pick = (from: number) =>
    Array.from({ length: 7 }, (_, i) => rates.get(dayKey(addDays(today, from + i)))).filter(Boolean) as DayRate[];
  const now = averageRate(pick(-6));
  const before = averageRate(pick(-13));
  if (now === null || before === null) return null;
  return Math.round((now - before) * 100);
}

/**
 * Weekday (0 = Monday … 6 = Sunday) with the best average rate over the given
 * days, once at least two of each weekday have data; null otherwise.
 */
export function bestWeekday(days: DayRate[]): number | null {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  for (const d of days) {
    if (d.rate === null) continue;
    const [y, m, day] = d.date.split('-').map(Number);
    const wd = (new Date(y, m - 1, day).getDay() + 6) % 7;
    sums[wd] += d.rate;
    counts[wd] += 1;
  }
  if (counts.some((c) => c < 2)) return null;
  let best = 0;
  for (let i = 1; i < 7; i++) if (sums[i] / counts[i] > sums[best] / counts[best]) best = i;
  return best;
}

import {
  addDays,
  averageRate,
  bestWeekday,
  dayKey,
  dayRates,
  duePerDay,
  rateLevel,
  weekOverWeek,
  weekStart,
  yearGrid,
  type DayRate,
  type StatsCompletion,
  type StatsHabit,
} from '../utils/stats-math';

// Thursday 1 October 2026, local time.
const TODAY = new Date(2026, 9, 1, 15, 0);
const at = (offset: number, hour = 12) => {
  const d = addDays(TODAY, offset);
  d.setHours(hour);
  return d.toISOString();
};
const habit = (id: string, frequency = 'daily', createdOffset = -400): StatsHabit => ({
  id,
  frequency,
  created_at: at(createdOffset),
});
const done = (habitId: string, offset: number, hour = 12): StatsCompletion => ({ habit_id: habitId, completed_at: at(offset, hour) });
const toMap = (days: DayRate[]) => new Map(days.map((d) => [d.date, d]));

describe('stats math', () => {
  it('counts "N times a week" quests as N/7 of a quest per day', () => {
    expect(duePerDay('daily')).toBe(1);
    expect(duePerDay('3x_week')).toBeCloseTo(3 / 7);
    // Chosen days: due on those days only (2026-10-05 is a Monday).
    expect(duePerDay('days', [1, 3], new Date(2026, 9, 5))).toBe(1);
    expect(duePerDay('days', [1, 3], new Date(2026, 9, 6))).toBe(0);
    expect(duePerDay('days', [1, 3])).toBeCloseTo(2 / 7);
  });

  it('rates a day as quests done / quests due, once per quest, capped at 100 %', () => {
    const habits = [habit('a'), habit('b'), habit('c', '2x_week')];
    const [day] = dayRates(habits, [done('a', 0), done('a', 0, 18), done('c', 0)], TODAY, TODAY);
    expect(day.done).toBe(2);
    expect(day.due).toBeCloseTo(2 + 2 / 7);
    expect(day.rate).toBeCloseTo(2 / (2 + 2 / 7));
    const [full] = dayRates([habit('c', '2x_week')], [done('c', 0)], TODAY, TODAY);
    expect(full.rate).toBe(1);
  });

  it('uses the local day, not the UTC date', () => {
    const late = new Date(2026, 9, 1, 23, 30).toISOString();
    const [day] = dayRates([habit('a')], [{ habit_id: 'a', completed_at: late }], TODAY, TODAY);
    expect(day.done).toBe(1);
  });

  it('ignores quests before they were created and while paused', () => {
    const young = habit('y', 'daily', 0);
    const paused = { ...habit('p'), is_paused: true, paused_at: at(-2) };
    const days = dayRates([young, paused], [], addDays(TODAY, -3), TODAY);
    expect(days.map((d) => d.due)).toEqual([1, 0, 0, 1]);
    expect(days[1].rate).toBeNull();
  });

  it('can focus on one quest', () => {
    const days = dayRates([habit('a'), habit('b')], [done('a', 0)], TODAY, TODAY, 'b');
    expect(days[0]).toMatchObject({ done: 0, due: 1, rate: 0 });
  });

  it('maps rates to 5 color levels', () => {
    expect([null, 0, 0.2, 0.5, 0.8, 1].map(rateLevel)).toEqual([-1, 0, 1, 2, 3, 4]);
  });

  it('lays the year out in weeks, Monday first, future days empty', () => {
    const rates = toMap(dayRates([habit('a')], [done('a', 0)], addDays(TODAY, -370), TODAY));
    const grid = yearGrid(rates, TODAY);
    expect(grid).toHaveLength(53);
    const last = grid[52];
    expect(last[0]?.date).toBe(dayKey(weekStart(TODAY))); // Monday 28 September
    expect(last[3]).toMatchObject({ date: '2026-10-01', rate: 1 });
    expect(last.slice(4)).toEqual([null, null, null]);
  });

  it('gives the change vs the previous 7 days', () => {
    const completions = Array.from({ length: 7 }, (_, i) => done('a', -i)); // last 7 days: all done
    const rates = toMap(dayRates([habit('a'), habit('b')], completions, addDays(TODAY, -100), TODAY));
    expect(weekOverWeek(rates, TODAY)).toBe(50);
    expect(averageRate([])).toBeNull();
  });

  it('finds the best weekday once there is enough data', () => {
    const completions: StatsCompletion[] = [];
    for (let i = 0; i < 28; i++) {
      const d = addDays(TODAY, -i);
      if (d.getDay() === 2) completions.push(done('a', -i)); // Tuesdays
    }
    const days = dayRates([habit('a')], completions, addDays(TODAY, -27), TODAY);
    expect(bestWeekday(days)).toBe(1);
    expect(bestWeekday(days.slice(-10))).toBeNull();
  });
});

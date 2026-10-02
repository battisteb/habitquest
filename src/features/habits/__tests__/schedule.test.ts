import { daysLabel, defaultDays, isDueOn, isoWeekday, scheduleToSave } from '../utils/schedule';

// 2026-10-05 is a Monday, 2026-10-11 a Sunday.
const monday = new Date(2026, 9, 5, 9);
const sunday = new Date(2026, 9, 11, 22);

describe('habit schedule', () => {
  it('numbers the days like ISO (Monday 1, Sunday 7)', () => {
    expect(isoWeekday(monday)).toBe(1);
    expect(isoWeekday(sunday)).toBe(7);
  });

  it('makes a chosen-days habit due on its days only', () => {
    const habit = { frequency: 'days', days: [1, 3, 5] };
    expect(isDueOn(habit, monday)).toBe(true);
    expect(isDueOn(habit, sunday)).toBe(false);
  });

  it('keeps daily and weekly habits due every day', () => {
    expect(isDueOn({ frequency: 'daily' }, sunday)).toBe(true);
    expect(isDueOn({ frequency: '3x_week', days: null }, sunday)).toBe(true);
  });

  it('saves seven days (or none) as every day, sorted otherwise', () => {
    expect(scheduleToSave([1, 2, 3, 4, 5, 6, 7])).toEqual({ frequency: 'daily', days: null });
    expect(scheduleToSave([])).toEqual({ frequency: 'daily', days: null });
    expect(scheduleToSave([5, 1, 3, 3])).toEqual({ frequency: 'days', days: [1, 3, 5] });
  });

  it('preselects days matching a template frequency', () => {
    expect(defaultDays('5x_week')).toEqual([1, 2, 3, 4, 5]);
    expect(defaultDays('3x_week')).toEqual([1, 3, 5]);
  });

  it('labels the days in order', () => {
    expect(daysLabel([5, 1], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])).toBe('Mon · Fri');
  });
});

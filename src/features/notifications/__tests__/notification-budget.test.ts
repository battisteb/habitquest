/**
 * Notification budget (D10, ADR 026): at most 2 reminders a day; on Sunday
 * the weekly recap takes the morning reminder's place.
 */
jest.mock('expo-constants', () => ({}));
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
const mockSchedule = jest.fn(() => Promise.resolve('id'));
const mockCancel = jest.fn(() => Promise.resolve());
jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: (...a: unknown[]) => mockSchedule(...(a as [])),
  cancelScheduledNotificationAsync: (...a: unknown[]) => mockCancel(...(a as [])),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
}));

import {
  NOTIFICATION_BUDGET,
  SUNDAY,
  dailyReminderWeekdays,
  remindersOn,
} from '../utils/notification-budget';
import { scheduleDailyReminder, cancelDailyReminder } from '../utils/notification-service';

const ALL_ON = { dailyReminderEnabled: true, streakRiskEnabled: true, weeklyRecapEnabled: true };

describe('notification budget', () => {
  it('never exceeds 2 reminders a day, whatever the settings', () => {
    const flags = [true, false];
    for (const d of flags) for (const s of flags) for (const w of flags) for (const risk of flags) {
      for (let weekday = 1; weekday <= 7; weekday++) {
        const prefs = { dailyReminderEnabled: d, streakRiskEnabled: s, weeklyRecapEnabled: w };
        expect(remindersOn(weekday, prefs, risk).length).toBeLessThanOrEqual(NOTIFICATION_BUDGET.perDay);
      }
    }
  });

  it('gives Sunday to the weekly recap', () => {
    expect(remindersOn(SUNDAY, ALL_ON, true)).toEqual(['weekly-recap', 'streak-risk']);
    expect(remindersOn(3, ALL_ON, true)).toEqual(['daily', 'streak-risk']);
    expect(dailyReminderWeekdays(true)).not.toContain(SUNDAY);
  });

  it('keeps the Sunday reminder when the recap is off', () => {
    expect(dailyReminderWeekdays(false)).toHaveLength(7);
    expect(remindersOn(SUNDAY, { ...ALL_ON, weeklyRecapEnabled: false }, false)).toEqual(['daily']);
  });

  it('sends the recap before the evening streak alert', () => {
    expect(NOTIFICATION_BUDGET.recapHour).toBeLessThan(NOTIFICATION_BUDGET.streakRiskHour);
  });
});

describe('daily reminder scheduling', () => {
  beforeEach(() => jest.clearAllMocks());

  it('schedules one weekly trigger per weekday, skipping Sunday with the recap', async () => {
    await scheduleDailyReminder(9, 0, true);
    const weekdays = mockSchedule.mock.calls.map((c) => (c as unknown as [{ trigger: { weekday: number } }])[0].trigger.weekday);
    expect(weekdays).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it('cancels the former single trigger too', async () => {
    await cancelDailyReminder();
    const ids = mockCancel.mock.calls.map((c) => (c as unknown as [string])[0]);
    expect(ids).toContain('daily-reminder');
    expect(ids).toContain('daily-reminder-1');
    expect(ids).toContain('daily-reminder-7');
  });
});

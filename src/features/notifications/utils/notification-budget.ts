/**
 * Notification budget (D10, ADR 026): the game sends at most 2 reminders a
 * day. Weekdays follow expo-notifications: 1 = Sunday … 7 = Saturday.
 *
 * - every day: the morning reminder, and the evening streak alert when a
 *   streak is at risk;
 * - Sunday: the weekly recap takes the morning reminder's place.
 *
 * Per-habit reminders are alarms the player set themselves and are not counted.
 */
export const NOTIFICATION_BUDGET = { perDay: 2, streakRiskHour: 20, recapHour: 18 } as const;

export const SUNDAY = 1;
const ALL_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

export type Reminder = 'daily' | 'streak-risk' | 'weekly-recap';

export interface ReminderPrefs {
  dailyReminderEnabled: boolean;
  streakRiskEnabled: boolean;
  weeklyRecapEnabled: boolean;
}

/** Weekdays that get the morning reminder. */
export function dailyReminderWeekdays(weeklyRecapEnabled: boolean): number[] {
  return weeklyRecapEnabled ? ALL_WEEKDAYS.filter((d) => d !== SUNDAY) : ALL_WEEKDAYS;
}

/** The reminders a given weekday can bring, at most NOTIFICATION_BUDGET.perDay. */
export function remindersOn(weekday: number, prefs: ReminderPrefs, streakAtRisk: boolean): Reminder[] {
  const out: Reminder[] = [];
  if (prefs.weeklyRecapEnabled && weekday === SUNDAY) out.push('weekly-recap');
  if (prefs.dailyReminderEnabled && dailyReminderWeekdays(prefs.weeklyRecapEnabled).includes(weekday)) out.push('daily');
  if (prefs.streakRiskEnabled && streakAtRisk) out.push('streak-risk');
  return out;
}

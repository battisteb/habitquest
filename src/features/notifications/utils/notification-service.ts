import { Platform } from 'react-native';
import { storage } from '../../../lib/storage/mmkv';
import { getRandomMessage } from './notification-messages';
import { getOptimalNotificationHour } from './adaptive-timing';
import { supabase } from '../../../lib/supabase/client';

const DAILY_REMINDER_ID = 'daily-reminder';
const STREAK_RISK_ID = 'streak-risk';
const WEEKLY_RECAP_ID = 'weekly-recap';

const PREFS_KEY = 'notification-prefs';

export interface NotificationPrefs {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  streakRiskEnabled: boolean;
  weeklyRecapEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminderEnabled: true,
  dailyReminderHour: 9,
  dailyReminderMinute: 0,
  streakRiskEnabled: true,
  weeklyRecapEnabled: true,
};

function isNative(): boolean {
  return Platform.OS !== 'web';
}

async function getNotifications() {
  return await import('expo-notifications');
}

export function getNotificationPrefs(): NotificationPrefs {
  const raw = storage.getString(PREFS_KEY);
  if (!raw) return DEFAULT_PREFS;
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  storage.set(PREFS_KEY, JSON.stringify(prefs));
}

export async function requestPermissions(): Promise<boolean> {
  if (!isNative()) return false;
  const Notifications = await getNotifications();
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function configureNotifications(): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'HabitQuest',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
}

export async function scheduleDailyReminder(hour: number, minute: number): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();

  await cancelDailyReminder();

  // Use the adaptive hour derived from the user's historical completion patterns;
  // fall back to the user-selected hour if no data is available yet.
  const adaptiveHour = getOptimalNotificationHour();
  const scheduledHour = adaptiveHour !== 9 ? adaptiveHour : hour;

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '⚔️ HabitQuest',
      body: getRandomMessage('reminder'),
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: scheduledHour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

export async function scheduleStreakRiskReminder(
  uncompletedCount: number,
  atRiskStreaks: number,
): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();

  await cancelStreakRiskReminder();

  if (uncompletedCount === 0 || atRiskStreaks === 0) return;

  const now = new Date();
  const trigger = new Date();
  trigger.setHours(20, 0, 0, 0);

  if (trigger <= now) return;

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_ID,
    content: {
      title: '🔥 Streak at risk!',
      body: getRandomMessage('streak_at_risk'),
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelStreakRiskReminder(): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID);
}

export async function scheduleWeeklyRecap(
  weekStats: { completions: number; bestStreak: number; xpEarned: number },
): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();

  await cancelWeeklyRecap();

  const { completions, bestStreak, xpEarned } = weekStats;

  const lines: string[] = [];
  if (completions > 0) lines.push(`${completions} habits done`);
  if (xpEarned > 0) lines.push(`+${xpEarned} XP`);
  if (bestStreak > 0) lines.push(`🔥 ${bestStreak}-day best streak`);

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_RECAP_ID,
    content: {
      title: '📊 Weekly Recap',
      body: lines.length > 0
        ? lines.join(' · ') + ' — Keep it up!'
        : 'A new week starts now. Make it count! ⚔️',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1, // Sunday
      hour: 20,
      minute: 0,
    },
  });
}

export async function cancelWeeklyRecap(): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(WEEKLY_RECAP_ID);
}

// ── Per-habit reminders ────────────────────────────────────────────────────────

const HABIT_REMINDER_PREFIX = 'habit-reminder-';

export function getHabitReminderKey(habitId: string): string {
  return HABIT_REMINDER_PREFIX + habitId;
}

export interface HabitReminder {
  hour: number;
  minute: number;
}

export function getHabitReminder(habitId: string): HabitReminder | null {
  const raw = storage.getString(getHabitReminderKey(habitId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as HabitReminder;
  } catch {
    return null;
  }
}

export async function scheduleHabitReminder(
  habitId: string,
  habitName: string,
  hour: number,
  minute: number,
): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();

  const granted = await requestPermissions();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    identifier: getHabitReminderKey(habitId),
    content: {
      title: `⚔️ ${habitName}`,
      body: `Time to work on your habit! Don't break the streak 🔥`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });

  storage.set(getHabitReminderKey(habitId), JSON.stringify({ hour, minute }));
}

export async function cancelHabitReminder(habitId: string): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(getHabitReminderKey(habitId));
  storage.delete(getHabitReminderKey(habitId));
}

// ──────────────────────────────────────────────────────────────────────────────

export async function applyNotificationPrefs(prefs?: NotificationPrefs): Promise<void> {
  const p = prefs ?? getNotificationPrefs();

  if (p.dailyReminderEnabled) {
    const granted = await requestPermissions();
    if (granted) {
      await scheduleDailyReminder(p.dailyReminderHour, p.dailyReminderMinute);
    }
  } else {
    await cancelDailyReminder();
  }

  if (!p.streakRiskEnabled) {
    await cancelStreakRiskReminder();
  }

  if (p.weeklyRecapEnabled) {
    const granted = await requestPermissions();
    if (granted) {
      // Schedule with zeroed stats — actual data injected when week ends
      await scheduleWeeklyRecap({ completions: 0, bestStreak: 0, xpEarned: 0 });
    }
  } else {
    await cancelWeeklyRecap();
  }
}

// ── Push token registration ────────────────────────────────────────────────────

export async function registerPushToken(userId: string): Promise<void> {
  if (!isNative()) return;
  try {
    const granted = await requestPermissions();
    if (!granted) return;

    const Notifications = await getNotifications();
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    if (!token) return;

    await (supabase.from('profiles') as any)
      .update({ push_token: token })
      .eq('id', userId);
  } catch {
    // Non-critical — don't block app startup
  }
}

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { storage } from '../../../lib/storage/mmkv';

const DAILY_REMINDER_ID = 'daily-reminder';
const STREAK_RISK_ID = 'streak-risk';

const PREFS_KEY = 'notification-prefs';

export interface NotificationPrefs {
  dailyReminderEnabled: boolean;
  dailyReminderHour: number;
  dailyReminderMinute: number;
  streakRiskEnabled: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dailyReminderEnabled: true,
  dailyReminderHour: 9,
  dailyReminderMinute: 0,
  streakRiskEnabled: true,
};

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
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function configureNotifications(): Promise<void> {
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
  // Cancel existing before rescheduling
  await cancelDailyReminder();

  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: '⚔️ HabitQuest',
      body: 'Your daily quests are waiting! Keep your streaks alive.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
}

export async function scheduleStreakRiskReminder(
  uncompletedCount: number,
  atRiskStreaks: number,
): Promise<void> {
  await cancelStreakRiskReminder();

  if (uncompletedCount === 0 || atRiskStreaks === 0) return;

  // Schedule for 8 PM today
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(20, 0, 0, 0);

  // If it's already past 8 PM, don't schedule
  if (trigger <= now) return;

  const streakWord = atRiskStreaks === 1 ? 'streak' : 'streaks';

  await Notifications.scheduleNotificationAsync({
    identifier: STREAK_RISK_ID,
    content: {
      title: '🔥 Streak at risk!',
      body: `You have ${uncompletedCount} uncompleted habits. ${atRiskStreaks} ${streakWord} will break if you miss today!`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    },
  });
}

export async function cancelStreakRiskReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(STREAK_RISK_ID);
}

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

  // Streak risk is scheduled dynamically from the habits hook, not here
  if (!p.streakRiskEnabled) {
    await cancelStreakRiskReminder();
  }
}

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { storage } from '../../../lib/storage/mmkv';
import { getRandomMessage } from './notification-messages';
import { getOptimalNotificationHour } from './adaptive-timing';
import { supabase } from '../../../lib/supabase/client';
import { lang$, getStrings } from '../../../lib/i18n';
import { onUserDataCleared } from '../../../lib/storage/user-data';

const DAILY_REMINDER_ID = 'daily-reminder';
const STREAK_RISK_ID = 'streak-risk';
const WEEKLY_RECAP_ID = 'weekly-recap';
const TRIAL_ENDING_ID = 'trial-ending';

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

// Lazily required so web never loads the native module.
async function getNotifications(): Promise<typeof import('expo-notifications')> {
  return require('expo-notifications');
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
      data: { route: '/(tabs)/today' },
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
      title: getStrings().notif_streak_risk_title,
      body: getRandomMessage('streak_at_risk'),
      sound: true,
      data: { route: '/(tabs)/today' },
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
  const RECAP = {
    fr: { done: (n: number) => `${n} habitudes faites`, streak: (n: number) => `🔥 Série de ${n} jours`, title: '📊 Récap de la semaine', more: ' — Continue !', empty: 'Une nouvelle semaine commence. Fais-en une bonne ! ⚔️' },
    en: { done: (n: number) => `${n} habits done`, streak: (n: number) => `🔥 ${n}-day best streak`, title: '📊 Weekly Recap', more: ' — Keep it up!', empty: 'A new week starts now. Make it count! ⚔️' },
    ja: { done: (n: number) => `${n}個の習慣を達成`, streak: (n: number) => `🔥 最高${n}日連続`, title: '📊 週間レポート', more: ' — この調子で！', empty: '新しい1週間のはじまり。いい週にしよう！ ⚔️' },
  }[lang$.get()];

  const lines: string[] = [];
  if (completions > 0) lines.push(RECAP.done(completions));
  if (xpEarned > 0) lines.push(`+${xpEarned} XP`);
  if (bestStreak > 0) lines.push(RECAP.streak(bestStreak));

  await Notifications.scheduleNotificationAsync({
    identifier: WEEKLY_RECAP_ID,
    content: {
      title: RECAP.title,
      body: lines.length > 0 ? lines.join(' · ') + RECAP.more : RECAP.empty,
      sound: true,
      data: { route: '/weekly-recap' },
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

// ── Free trial ending ─────────────────────────────────────────────────────────

/**
 * Warns the player 2 days before the free trial turns into a paid
 * subscription (null cancels it: no trial, or the warning time is past).
 */
export async function scheduleTrialEndingNotice(at: Date | null): Promise<void> {
  if (!isNative()) return;
  const Notifications = await getNotifications();
  await Notifications.cancelScheduledNotificationAsync(TRIAL_ENDING_ID);
  if (!at) return;
  const T = getStrings();
  const store = Platform.OS === 'android' ? 'Google Play' : 'App Store';
  await Notifications.scheduleNotificationAsync({
    identifier: TRIAL_ENDING_ID,
    content: {
      title: T.trial_ending_title,
      body: T.trial_ending_body.replace('{store}', store),
      sound: true,
      data: { route: '/paywall' },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
  });
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
      body: lang$.get() === 'fr'
        ? `C'est l'heure de travailler sur ton habitude ! Ne brise pas la série 🔥`
        : lang$.get() === 'ja'
          ? `習慣の時間だよ！連続記録を途切れさせないで 🔥`
          : `Time to work on your habit! Don't break the streak 🔥`,
      sound: true,
      data: { route: `/habit/${habitId}` },
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

// Per-habit reminders belong to the signed-in user: drop them on sign-out.
onUserDataCleared(async () => {
  if (!isNative()) return;
  const Notifications = await getNotifications();
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .map((n: { identifier: string }) => n.identifier)
      .filter((id: string) => id.startsWith(HABIT_REMINDER_PREFIX))
      .map(async (id: string) => {
        await Notifications.cancelScheduledNotificationAsync(id);
        storage.delete(id);
      }),
  );
});

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

export async function registerPushToken(): Promise<void> {
  if (!isNative()) return;
  try {
    const granted = await requestPermissions();
    if (!granted) return;

    // Standalone builds need the EAS project id to get an Expo push token.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const Notifications = await getNotifications();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    // Tokens live in a private table; the RPC also detaches the device from
    // any account previously signed in on it.
    await supabase.rpc('register_push_token', { p_token: token });
  } catch {
    // Non-critical — don't block app startup
  }
}

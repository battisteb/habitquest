import { useEffect } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import {
  getNotificationPrefs,
  scheduleWeeklyRecap,
  cancelWeeklyRecap,
  requestPermissions,
} from '../utils/notification-service';

async function fetchWeekStats(): Promise<{ completions: number; bestStreak: number; xpEarned: number }> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return { completions: 0, bestStreak: 0, xpEarned: 0 };

  try {
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const { data: habits } = await supabase
      .from('habits')
      .select('id')
      .eq('user_id', userId)
      .eq('is_archived', false);

    if (!habits || habits.length === 0) return { completions: 0, bestStreak: 0, xpEarned: 0 };

    const habitIds = habits.map((h) => h.id);

    const { data: completionsData } = await supabase
      .from('completions')
      .select('xp_earned')
      .in('habit_id', habitIds)
      .gte('completed_at', monday.toISOString());

    const completions = completionsData?.length ?? 0;
    const xpEarned = completionsData?.reduce((sum, c) => sum + (c.xp_earned ?? 0), 0) ?? 0;

    const { data: streaks } = await supabase
      .from('streaks')
      .select('longest_count')
      .in('habit_id', habitIds);

    const bestStreak = streaks?.reduce((max, s) => Math.max(max, s.longest_count ?? 0), 0) ?? 0;

    return { completions, bestStreak, xpEarned };
  } catch {
    return { completions: 0, bestStreak: 0, xpEarned: 0 };
  }
}

async function refreshWeeklyRecap() {
  const prefs = getNotificationPrefs();
  if (!prefs.weeklyRecapEnabled) {
    await cancelWeeklyRecap();
    return;
  }
  const granted = await requestPermissions();
  if (!granted) return;

  const stats = await fetchWeekStats();
  await scheduleWeeklyRecap(stats);
}

/**
 * Reschedules the weekly recap notification with real stats whenever
 * the app comes to the foreground.
 */
export function useWeeklyRecapScheduler() {
  useEffect(() => {
    refreshWeeklyRecap();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshWeeklyRecap();
      }
    });

    return () => sub.remove();
  }, []);
}

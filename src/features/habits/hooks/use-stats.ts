import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';

interface DayCompletion {
  date: string;
  count: number;
}

interface HabitStats {
  totalCompletions: number;
  currentActiveStreaks: number;
  bestStreak: number;
  weeklyCompletions: DayCompletion[];
  monthlyCompletions: DayCompletion[];
  completionRateThisWeek: number;
  isLoading: boolean;
}

export function useStats(): HabitStats {
  const [stats, setStats] = useState<HabitStats>({
    totalCompletions: 0,
    currentActiveStreaks: 0,
    bestStreak: 0,
    weeklyCompletions: [],
    monthlyCompletions: [],
    completionRateThisWeek: 0,
    isLoading: true,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    try {
      // Get all habits
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (!habits || habits.length === 0) {
        setStats((s) => ({ ...s, isLoading: false }));
        return;
      }

      const habitIds = habits.map((h) => h.id);
      const totalHabits = habitIds.length;

      // Get all streaks
      const { data: streaks } = await supabase
        .from('streaks')
        .select('*')
        .in('habit_id', habitIds);

      const activeStreaks = streaks?.filter((s) => s.current_count > 0).length ?? 0;
      const bestStreak = streaks?.reduce((max, s) => Math.max(max, s.longest_count), 0) ?? 0;

      // Get completions for last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const { data: completions } = await supabase
        .from('completions')
        .select('completed_at')
        .in('habit_id', habitIds)
        .gte('completed_at', sevenDaysAgo.toISOString());

      // Group completions by day
      const dayMap = new Map<string, number>();
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().split('T')[0];
        dayMap.set(key, 0);
      }

      completions?.forEach((c) => {
        const key = c.completed_at.split('T')[0];
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      });

      const weeklyCompletions: DayCompletion[] = [];
      dayMap.forEach((count, date) => {
        weeklyCompletions.push({ date, count });
      });

      // Get completions for last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const { data: monthlyData } = await supabase
        .from('completions')
        .select('completed_at')
        .in('habit_id', habitIds)
        .gte('completed_at', thirtyDaysAgo.toISOString());

      const monthMap = new Map<string, number>();
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        const key = d.toISOString().split('T')[0];
        monthMap.set(key, 0);
      }

      monthlyData?.forEach((c) => {
        const key = c.completed_at.split('T')[0];
        monthMap.set(key, (monthMap.get(key) ?? 0) + 1);
      });

      const monthlyCompletions: DayCompletion[] = [];
      monthMap.forEach((count, date) => {
        monthlyCompletions.push({ date, count });
      });

      // Total completions
      const { count: totalCompletions } = await supabase
        .from('completions')
        .select('*', { count: 'exact', head: true })
        .in('habit_id', habitIds);

      // Completion rate: completions this week / (habits * 7 days)
      const totalWeekCompletions = completions?.length ?? 0;
      const maxPossible = totalHabits * 7;
      const completionRate = maxPossible > 0 ? Math.round((totalWeekCompletions / maxPossible) * 100) : 0;

      setStats({
        totalCompletions: totalCompletions ?? 0,
        currentActiveStreaks: activeStreaks,
        bestStreak,
        weeklyCompletions,
        monthlyCompletions,
        completionRateThisWeek: completionRate,
        isLoading: false,
      });
    } catch {
      setStats((s) => ({ ...s, isLoading: false }));
    }
  }

  return stats;
}

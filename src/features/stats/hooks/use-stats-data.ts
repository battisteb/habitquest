import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { addDays, weekStart, type StatsCompletion, type StatsHabit } from '../utils/stats-math';

export interface StatsHabitRow extends StatsHabit {
  name: string;
  emoji: string | null;
  category: string;
}

export interface StatsData {
  habits: StatsHabitRow[];
  completions: StatsCompletion[];
  totalCompletions: number;
  activeStreaks: number;
  bestStreak: number;
  isLoading: boolean;
  reload: () => void;
}

/** Weeks of history loaded: the year grid shows 53. */
export const HISTORY_WEEKS = 53;
const PAGE = 1000;

/** Completions since `since`, page by page (the API returns at most 1 000 rows at once). */
async function fetchCompletions(habitIds: string[], since: string): Promise<StatsCompletion[]> {
  const out: StatsCompletion[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('completions')
      .select('habit_id, completed_at')
      .in('habit_id', habitIds)
      .gte('completed_at', since)
      .order('completed_at', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error || !data) break;
    out.push(...data);
    if (data.length < PAGE) break;
  }
  return out;
}

export function useStatsData(): StatsData {
  const [state, setState] = useState<Omit<StatsData, 'reload'>>({
    habits: [],
    completions: [],
    totalCompletions: 0,
    activeStreaks: 0,
    bestStreak: 0,
    isLoading: true,
  });

  const load = useCallback(async () => {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;
    try {
      const { data: habits } = await supabase
        .from('habits')
        .select('id, name, emoji, category, frequency, created_at, is_paused, paused_at')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('created_at', { ascending: true });
      if (!habits || habits.length === 0) {
        setState((s) => ({ ...s, habits: [], completions: [], isLoading: false }));
        return;
      }
      const ids = habits.map((h) => h.id);
      const since = addDays(weekStart(new Date()), -7 * (HISTORY_WEEKS - 1)).toISOString();
      const [completions, { data: streaks }, { count }] = await Promise.all([
        fetchCompletions(ids, since),
        supabase.from('streaks').select('current_count, longest_count').in('habit_id', ids),
        supabase.from('completions').select('*', { count: 'exact', head: true }).in('habit_id', ids),
      ]);
      setState({
        habits: habits as StatsHabitRow[],
        completions,
        totalCompletions: count ?? completions.length,
        activeStreaks: streaks?.filter((s) => s.current_count > 0).length ?? 0,
        bestStreak: streaks?.reduce((max, s) => Math.max(max, s.longest_count), 0) ?? 0,
        isLoading: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { ...state, reload: () => void load() };
}

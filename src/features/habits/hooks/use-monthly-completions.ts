import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { habitsStore$ } from '../stores/habits-store';

export interface MonthlyCompletionData {
  /** ISO date string → completion count for that day */
  counts: Record<string, number>;
  isLoading: boolean;
  year: number;
  month: number; // 0-indexed
}

export function useMonthlyCompletions(year?: number, month?: number, habitId?: string): MonthlyCompletionData {
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const habitIds = habitId
        ? [habitId]
        : habitsStore$.habits.get().map((h) => h.id);
      if (habitIds.length === 0) {
        if (!cancelled) { setCounts({}); setIsLoading(false); }
        return;
      }

      const monthStart = new Date(y, m, 1).toISOString();
      const monthEnd = new Date(y, m + 1, 1).toISOString();

      const { data } = await supabase
        .from('completions')
        .select('completed_at')
        .in('habit_id', habitIds)
        .gte('completed_at', monthStart)
        .lt('completed_at', monthEnd);

      if (!cancelled) {
        const map: Record<string, number> = {};
        data?.forEach((c) => {
          const d = c.completed_at.slice(0, 10); // YYYY-MM-DD
          map[d] = (map[d] ?? 0) + 1;
        });
        setCounts(map);
        setIsLoading(false);
      }
    }
    setIsLoading(true);
    load();
    return () => { cancelled = true; };
  }, [y, m, habitId]);

  return { counts, isLoading, year: y, month: m };
}

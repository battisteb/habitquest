import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { CATEGORY_CONFIG } from '../../../lib/constants/categories';

export interface CategoryStat {
  category: string;
  label: string;
  icon: string;
  color: string;
  habitCount: number;
  completions30d: number;
  maxPossible: number;
  rate: number;
}

interface CategoryStatsResult {
  stats: CategoryStat[];
  isLoading: boolean;
}

export function useCategoryStats(): CategoryStatsResult {
  const [result, setResult] = useState<CategoryStatsResult>({ stats: [], isLoading: true });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const userId = authStore$.user.get()?.id;
    if (!userId) {
      setResult({ stats: [], isLoading: false });
      return;
    }

    try {
      const { data: habits } = await supabase
        .from('habits')
        .select('id, category')
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (!habits?.length) {
        setResult({ stats: [], isLoading: false });
        return;
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      thirtyDaysAgo.setHours(0, 0, 0, 0);

      const { data: completions } = await supabase
        .from('completions')
        .select('habit_id')
        .in('habit_id', habits.map((h) => h.id))
        .gte('completed_at', thirtyDaysAgo.toISOString());

      const habitsByCategory = new Map<string, string[]>();
      habits.forEach((h) => {
        const cat = h.category || 'general';
        if (!habitsByCategory.has(cat)) habitsByCategory.set(cat, []);
        habitsByCategory.get(cat)!.push(h.id);
      });

      const completionsByHabit = new Map<string, number>();
      completions?.forEach((c) => {
        completionsByHabit.set(c.habit_id, (completionsByHabit.get(c.habit_id) ?? 0) + 1);
      });

      const stats: CategoryStat[] = [];
      habitsByCategory.forEach((habitIds, category) => {
        const config = (CATEGORY_CONFIG as any)[category] ?? CATEGORY_CONFIG.general;
        const completions30d = habitIds.reduce(
          (sum, id) => sum + (completionsByHabit.get(id) ?? 0),
          0,
        );
        const maxPossible = habitIds.length * 30;
        stats.push({
          category,
          label: config.label,
          icon: config.icon,
          color: config.color,
          habitCount: habitIds.length,
          completions30d,
          maxPossible,
          rate: maxPossible > 0 ? Math.round((completions30d / maxPossible) * 100) : 0,
        });
      });

      stats.sort((a, b) => b.completions30d - a.completions30d);
      setResult({ stats, isLoading: false });
    } catch {
      setResult({ stats: [], isLoading: false });
    }
  }

  return result;
}

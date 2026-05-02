import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';

export type GoalSuggestionType = 'level_up' | 'keep_going' | 'restart' | 'none';

export interface GoalSuggestion {
  type: GoalSuggestionType;
  completions: number;
  total: number;
}

export function useDynamicGoal(habitId: string, _streakCount: number): GoalSuggestion {
  const [suggestion, setSuggestion] = useState<GoalSuggestion>({ type: 'none', completions: 0, total: 14 });

  useEffect(() => {
    if (!habitId) return;
    analyse(habitId).then(setSuggestion);
  }, [habitId]);

  return suggestion;
}

async function analyse(habitId: string): Promise<GoalSuggestion> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .eq('habit_id', habitId)
    .gte('completed_at', fourteenDaysAgo.toISOString());

  const completions = count ?? 0;
  const rate = completions / 14;

  if (rate >= 0.93) return { type: 'level_up', completions, total: 14 };
  if (rate >= 0.7)  return { type: 'keep_going', completions, total: 14 };
  if (rate >= 0.4)  return { type: 'keep_going', completions, total: 14 };
  if (completions > 0) return { type: 'restart', completions, total: 14 };

  return { type: 'none', completions: 0, total: 14 };
}

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';

export type GoalSuggestion =
  | { type: 'level_up';   message: string; detail: string }
  | { type: 'keep_going'; message: string; detail: string }
  | { type: 'restart';    message: string; detail: string }
  | { type: 'none' };

/**
 * Analyses the last 14 days of completions for a habit and returns
 * a contextual goal suggestion.
 */
export function useDynamicGoal(habitId: string, streakCount: number): GoalSuggestion {
  const [suggestion, setSuggestion] = useState<GoalSuggestion>({ type: 'none' });

  useEffect(() => {
    if (!habitId) return;
    analyse(habitId, streakCount).then(setSuggestion);
  }, [habitId, streakCount]);

  return suggestion;
}

async function analyse(habitId: string, streakCount: number): Promise<GoalSuggestion> {
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .eq('habit_id', habitId)
    .gte('completed_at', fourteenDaysAgo.toISOString());

  const completions = count ?? 0;
  const rate = completions / 14; // 0–1

  if (rate >= 0.93) {
    // Perfect or near-perfect — suggest levelling up
    return {
      type: 'level_up',
      message: '🚀 Ready to level up?',
      detail: `${completions}/14 days done — you're crushing it. Consider increasing difficulty or adding a new habit.`,
    };
  }

  if (rate >= 0.7) {
    // Good consistency — encourage maintenance
    return {
      type: 'keep_going',
      message: '🔥 Great consistency!',
      detail: `${completions}/14 days done. Keep this rhythm — you're building a solid habit.`,
    };
  }

  if (rate >= 0.4) {
    // Moderate — suggest simplifying
    return {
      type: 'keep_going',
      message: '💪 Making progress',
      detail: `${completions}/14 days done. Try to be consistent for 7 days straight to solidify the habit.`,
    };
  }

  if (completions > 0) {
    // Low rate — encourage restart
    return {
      type: 'restart',
      message: '🌱 Fresh start',
      detail: `${completions}/14 days done. Consider making this habit smaller or easier to reduce friction.`,
    };
  }

  return { type: 'none' };
}

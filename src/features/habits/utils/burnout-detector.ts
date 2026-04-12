import { supabase } from '../../../lib/supabase/client';

export type BurnoutRisk = 'none' | 'mild' | 'moderate' | 'high';

export interface BurnoutSignal {
  risk: BurnoutRisk;
  message: string;
  suggestion: string;
}

export async function detectBurnoutRisk(userId: string): Promise<BurnoutSignal> {
  const now = new Date();

  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(now.getDate() - 14);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const twentyEightDaysAgo = new Date(now);
  twentyEightDaysAgo.setDate(now.getDate() - 28);
  twentyEightDaysAgo.setHours(0, 0, 0, 0);

  // Query active habits for the user
  const { data: habits, error: habitsError } = await supabase
    .from('habits')
    .select('id')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .eq('is_paused', false);

  if (habitsError || !habits) {
    return { risk: 'none', message: '', suggestion: '' };
  }

  const activeHabits = habits.length;

  if (activeHabits === 0) {
    return { risk: 'none', message: '', suggestion: '' };
  }

  const habitIds = habits.map((h) => h.id);

  // Recent 14 days completions
  const { count: recentCount, error: recentError } = await supabase
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .in('habit_id', habitIds)
    .gte('completed_at', fourteenDaysAgo.toISOString());

  if (recentError) {
    return { risk: 'none', message: '', suggestion: '' };
  }

  // Previous 14 days completions (28 to 14 days ago)
  const { count: previousCount, error: previousError } = await supabase
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .in('habit_id', habitIds)
    .gte('completed_at', twentyEightDaysAgo.toISOString())
    .lt('completed_at', fourteenDaysAgo.toISOString());

  if (previousError) {
    return { risk: 'none', message: '', suggestion: '' };
  }

  const maxPossible = activeHabits * 14;

  const recentRate = Math.min((recentCount ?? 0) / maxPossible, 1);
  const previousRate = Math.min((previousCount ?? 0) / maxPossible, 1);
  const decline = previousRate - recentRate;

  if (recentRate < 0.3 && decline > 0.2) {
    return {
      risk: 'high',
      message: '⚠️ Burnout detected',
      suggestion: 'Consider taking a rest day or pausing some habits.',
    };
  }

  if (recentRate < 0.5 && decline > 0.15) {
    return {
      risk: 'moderate',
      message: '😓 Momentum dropping',
      suggestion: 'Try reducing to 3–4 habits for a week.',
    };
  }

  if (decline > 0.1) {
    return {
      risk: 'mild',
      message: '📉 Slight decline',
      suggestion: 'Keep going — a few missed days is normal.',
    };
  }

  return { risk: 'none', message: '', suggestion: '' };
}

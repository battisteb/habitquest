import { supabase } from '../../../lib/supabase/client';

export interface BrokenStreakInfo {
  habitId: string;
  wasCount: number;
}

interface StreakBreaksResult {
  broken: { habit_id: string; was_count: number }[];
  xp_loss: number;
  gold_loss: number;
  /** Days covered by an automatic freeze instead of breaking the streak. */
  auto_frozen?: string[];
}

/**
 * Asks the server to reset streaks whose missed days were not frozen (see
 * process_streak_breaks). There is no penalty: a break opens a 24-hour
 * comeback window with double XP (ADR 019). Idempotent: a broken streak is at
 * 0 afterwards, so calling it again changes nothing.
 */
export async function checkAndApplyPunishments(): Promise<{
  totalXpLoss: number;
  totalGoldLoss: number;
  brokenCount: number;
  brokenStreaks: BrokenStreakInfo[];
  autoFrozenDays: string[];
}> {
  const { data, error } = await supabase.rpc('process_streak_breaks');
  if (error || !data) {
    return { totalXpLoss: 0, totalGoldLoss: 0, brokenCount: 0, brokenStreaks: [], autoFrozenDays: [] };
  }

  const result = data as unknown as StreakBreaksResult;
  return {
    totalXpLoss: result.xp_loss,
    totalGoldLoss: result.gold_loss,
    brokenCount: result.broken.length,
    brokenStreaks: result.broken.map((b) => ({ habitId: b.habit_id, wasCount: b.was_count })),
    autoFrozenDays: result.auto_frozen ?? [],
  };
}

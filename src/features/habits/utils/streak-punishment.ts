import { supabase } from '../../../lib/supabase/client';
import { storage } from '../../../lib/storage/mmkv';
import { calculatePunishment } from './punishment';
import { isFreezeActiveToday } from './streak-freeze';

const PUNISHED_KEY = 'punished-streaks';

function getPunishedSet(): Set<string> {
  const raw = storage.getString(PUNISHED_KEY);
  if (!raw) return new Set();
  try {
    return new Set(JSON.parse(raw));
  } catch {
    return new Set();
  }
}

function savePunishedSet(set: Set<string>): void {
  storage.set(PUNISHED_KEY, JSON.stringify([...set]));
}

export interface BrokenStreakInfo {
  habitId: string;
  wasCount: number;
}

export async function checkAndApplyPunishments(
  userId: string,
  streaks: Record<string, { current_count: number; longest_count: number; last_completed_at: string | null; habit_id: string }>,
): Promise<{ totalXpLoss: number; totalGoldLoss: number; brokenCount: number; brokenStreaks: BrokenStreakInfo[] }> {
  if (isFreezeActiveToday()) {
    return { totalXpLoss: 0, totalGoldLoss: 0, brokenCount: 0, brokenStreaks: [] };
  }

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const punished = getPunishedSet();

  let totalXpLoss = 0;
  let totalGoldLoss = 0;
  let brokenCount = 0;
  const brokenStreaks: BrokenStreakInfo[] = [];

  for (const streak of Object.values(streaks)) {
    if (!streak.last_completed_at || streak.current_count === 0) continue;

    const lastCompleted = new Date(streak.last_completed_at);
    const daysSince = Math.floor(
      (now.getTime() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSince <= 1) continue;

    const punishKey = `${streak.habit_id}:${today}`;
    if (punished.has(punishKey)) continue;

    const { xpLoss, goldLoss } = calculatePunishment(streak.current_count);
    totalXpLoss += xpLoss;
    totalGoldLoss += goldLoss;
    brokenCount++;
    brokenStreaks.push({ habitId: streak.habit_id, wasCount: streak.current_count });

    punished.add(punishKey);

    await supabase
      .from('streaks')
      .update({ current_count: 0 })
      .eq('habit_id', streak.habit_id);
  }

  if (totalXpLoss > 0 || totalGoldLoss > 0) {
    await supabase.rpc('apply_punishment', {
      p_user_id: userId,
      p_xp_loss: totalXpLoss,
      p_gold_loss: totalGoldLoss,
    });
  }

  savePunishedSet(punished);

  return { totalXpLoss, totalGoldLoss, brokenCount, brokenStreaks };
}

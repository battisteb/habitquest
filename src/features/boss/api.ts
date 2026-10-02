import { supabase } from '../../lib/supabase/client';
import type { BossKey } from './sprites';

/** Shape of public.get_weekly_boss() (supabase/migrations/20261003220000_weekly_boss.sql). */
export interface WeeklyBoss {
  week_start: string;
  ends_on: string;
  boss_key: BossKey;
  hp_max: number;
  damage: number;
  defeated: boolean;
  reward_xp: number;
  reward_gold: number;
}

export async function fetchWeeklyBoss(): Promise<WeeklyBoss> {
  const { data, error } = await supabase.rpc('get_weekly_boss' as never);
  if (error) throw error;
  return data as unknown as WeeklyBoss;
}

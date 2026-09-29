import { supabase } from '../../lib/supabase/client';
import type { ArenaState } from './types';

/** Joins the current season if needed and resolves the fights that are due (ADR 012). */
export async function fetchArenaState(): Promise<ArenaState> {
  const { data, error } = await supabase.rpc('arena_state');
  if (error) throw error;
  return data as unknown as ArenaState;
}

/** Hides the promotion / relegation banner once it has been shown. */
export async function ackArenaResult(): Promise<void> {
  const { error } = await supabase.rpc('arena_ack_result');
  if (error) throw error;
}

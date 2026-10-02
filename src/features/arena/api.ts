import { supabase } from '../../lib/supabase/client';
import type { ArenaState, ArenaLocked } from './types';

/** Joins the current season if needed and resolves the fights that are due (ADR 012). */
export async function fetchArenaState(): Promise<ArenaState | ArenaLocked> {
  const { data, error } = await supabase.rpc('arena_state');
  if (error) throw error;
  return data as unknown as ArenaState | ArenaLocked;
}

/** Hides the promotion / relegation banner once it has been shown. */
export async function ackArenaResult(): Promise<void> {
  const { error } = await supabase.rpc('arena_ack_result');
  if (error) throw error;
}

/** Id of a real player met in the arena (to show their hero in a replay). */
export async function findPlayerId(username: string): Promise<string | null> {
  const { data } = await supabase.from('profiles').select('id').eq('username', username).maybeSingle();
  return data?.id ?? null;
}

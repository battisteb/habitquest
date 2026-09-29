import { supabase } from '../../lib/supabase/client';
import type { CoopGoal } from '../../lib/constants/game-config';
import type { CoopChallenge } from './types';

/** Raised by the server when the player has no co-op slot left (1 free, 2 Premium). */
export class CoopLimitError extends Error {}

function rethrow(error: { message?: string } | null): void {
  if (!error) return;
  if (error.message?.includes('coop_limit')) throw new CoopLimitError(error.message);
  throw error;
}

export async function fetchCoopChallenges(): Promise<CoopChallenge[]> {
  const { data, error } = await supabase.rpc('get_coop_challenges');
  rethrow(error);
  return (data as unknown as CoopChallenge[]) ?? [];
}

export async function createCoopChallenge(
  friendIds: string[],
  goal: CoopGoal,
  target: number,
  days: number,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_coop_challenge', {
    p_friend_ids: friendIds,
    p_goal: goal,
    p_target: target,
    p_days: days,
  });
  rethrow(error);
  return data as string;
}

export async function respondCoopChallenge(id: string, accept: boolean): Promise<void> {
  const { error } = await supabase.rpc('respond_coop_challenge', { p_id: id, p_accept: accept });
  rethrow(error);
}

export async function cancelCoopChallenge(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_coop_challenge', { p_id: id });
  rethrow(error);
}

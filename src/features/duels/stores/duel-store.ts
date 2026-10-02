import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { simulateDuel, PlayerState } from '../utils/combat-engine';

export interface DuelChallenge {
  id: string;
  challengerId: string;
  opponentId: string;
  challengerName: string;
  opponentName: string;
  challengerLevel: number;
  opponentLevel: number;
  challengerAttackId: string | null;
  opponentAttackId: string | null;
  status: 'pending' | 'active' | 'resolved' | 'cancelled';
  winnerId: string | null;
  rounds: RoundRecord[];
  createdAt: string;
}

interface RoundRecord {
  attackerId: string;
  attackName: string;
  result: {
    hit: boolean;
    damage: number;
    effect: string;
  };
  hpAfter: { [playerId: string]: number };
}

interface DuelState {
  pendingDuels: DuelChallenge[];
  activeDuels: DuelChallenge[];
  resolvedDuels: DuelChallenge[];
  myUnlockedCategories: string[];
  weeklyDuelsUsed: number;
  isLoading: boolean;
}

export const duelStore$ = observable<DuelState>({
  pendingDuels: [],
  activeDuels: [],
  resolvedDuels: [],
  myUnlockedCategories: [],
  weeklyDuelsUsed: 0,
  isLoading: false,
});

/** Fetch categories where user has >= 7 completions (unlocked attacks) */
export async function fetchUnlockedCategories(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { data: habits } = await supabase
    .from('habits')
    .select('id, category')
    .eq('user_id', userId)
    .eq('is_archived', false);

  if (!habits?.length) return;

  const categories: string[] = [];
  for (const habit of habits) {
    const { count } = await supabase
      .from('completions')
      .select('*', { count: 'exact', head: true })
      .eq('habit_id', habit.id);
    if ((count ?? 0) >= 7) categories.push(habit.category as string);
  }

  duelStore$.myUnlockedCategories.set([...new Set(categories)]);
}

/** Load all of the user's duels from Supabase into the store */
export async function fetchDuels(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  duelStore$.isLoading.set(true);

  const { data, error } = await supabase
    .from('duels')
    .select('*')
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  duelStore$.isLoading.set(false);

  if (error || !data) return;

  const pending: DuelChallenge[] = [];
  const active: DuelChallenge[] = [];
  const resolved: DuelChallenge[] = [];

  for (const row of data) {
    const duel: DuelChallenge = {
      id: row.id as string,
      challengerId: row.challenger_id as string,
      opponentId: row.opponent_id as string,
      challengerName: '',
      opponentName: '',
      challengerLevel: 1,
      opponentLevel: 1,
      challengerAttackId: row.challenger_attack_id as string | null,
      opponentAttackId: row.opponent_attack_id as string | null,
      status: row.status as DuelChallenge['status'],
      winnerId: row.winner_id as string | null,
      rounds: (row.rounds as unknown as RoundRecord[]) ?? [],
      createdAt: row.created_at as string,
    };

    if (duel.status === 'pending') pending.push(duel);
    else if (duel.status === 'active') active.push(duel);
    else if (duel.status === 'resolved') resolved.push(duel);
  }

  duelStore$.pendingDuels.set(pending);
  duelStore$.activeDuels.set(active);
  duelStore$.resolvedDuels.set(resolved);
}

/** Records a friendly duel against a friend and returns its id (the server checks friendship). */
export async function createDuel(opponentId: string, attackId: string): Promise<string> {
  const userId = authStore$.user.get()?.id;
  if (!userId) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('duels')
    .insert({
      challenger_id: userId,
      opponent_id: opponentId,
      challenger_attack_id: attackId,
      status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Duel not created');

  await fetchDuels();
  return data.id as string;
}

/**
 * Records the result of a friendly duel (winnerId null for a draw). Friendly
 * duels pay nothing: the friend is told the result by the server.
 */
export async function resolveDuel(duelId: string, winnerId: string | null): Promise<void> {
  const { error } = await supabase
    .from('duels')
    .update({ status: 'resolved', winner_id: winnerId })
    .eq('id', duelId);
  if (error) throw new Error(error.message);
  void fetchDuels();
}

// Re-export simulateDuel so screens can import from a single location if desired
export { simulateDuel };
export type { PlayerState };

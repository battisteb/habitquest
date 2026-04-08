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

/** Returns the start of the current ISO week (Monday 00:00 UTC) */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday ...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  const monday = new Date(now);
  monday.setUTCDate(now.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday.toISOString();
}

/** Count the user's non-cancelled duels created since Monday 00:00 UTC */
export async function getWeeklyDuelsUsed(): Promise<number> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return 0;

  const weekStart = getWeekStart();

  const { count, error } = await (supabase as any)
    .from('duels')
    .select('*', { count: 'exact', head: true })
    .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
    .gte('created_at', weekStart)
    .neq('status', 'cancelled');

  if (error) return 0;
  return count ?? 0;
}

/** Returns true when the user can still start a duel this week (limit: 2) */
export async function canStartDuel(): Promise<boolean> {
  const used = await getWeeklyDuelsUsed();
  return used < 2;
}

/** Load all of the user's duels from Supabase into the store */
export async function fetchDuels(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  duelStore$.isLoading.set(true);

  const { data, error } = await (supabase as any)
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
      rounds: (row.rounds as RoundRecord[]) ?? [],
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

/** Create a new duel challenge, enforcing the 2-per-week limit */
export async function createDuel(opponentId: string, attackId: string): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) throw new Error('Not authenticated');

  const allowed = await canStartDuel();
  if (!allowed) {
    throw new Error('Weekly duel limit reached — 2 duels per week maximum');
  }

  const { error } = await (supabase as any).from('duels').insert({
    challenger_id: userId,
    opponent_id: opponentId,
    challenger_attack_id: attackId,
    status: 'pending',
  });

  if (error) throw new Error(error.message);

  await fetchDuels();
}

/** Award gold and XP at end of a duel. Call once the winner is known. */
export async function resolveDuel(
  duelId: string | null,
  winnerId: string,
  loserId: string,
): Promise<{ winnerGold: number; loserXp: number }> {
  const WINNER_GOLD = 30;
  const LOSER_CATCHUP_XP = 25;

  const userId = authStore$.user.get()?.id;
  if (!userId) return { winnerGold: 0, loserXp: 0 };

  // Persist duel result to DB if we have a real duelId
  if (duelId) {
    await (supabase as any)
      .from('duels')
      .update({ status: 'resolved', winner_id: winnerId })
      .eq('id', duelId);
  }

  // Award gold to winner
  if (userId === winnerId) {
    await supabase.rpc('increment_gold' as never, {
      user_id: userId,
      gold_amount: WINNER_GOLD,
    } as never);
  }

  // Award catch-up XP to loser
  if (userId === loserId) {
    await supabase.rpc('increment_xp' as never, {
      user_id: userId,
      xp_amount: LOSER_CATCHUP_XP,
    } as never);
  }

  return { winnerGold: WINNER_GOLD, loserXp: LOSER_CATCHUP_XP };
}

// Re-export simulateDuel so screens can import from a single location if desired
export { simulateDuel };
export type { PlayerState };

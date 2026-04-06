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
  status: 'pending' | 'active' | 'resolved';
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
  isLoading: boolean;
}

export const duelStore$ = observable<DuelState>({
  pendingDuels: [],
  activeDuels: [],
  resolvedDuels: [],
  myUnlockedCategories: [],
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

// Re-export simulateDuel so screens can import from a single location if desired
export { simulateDuel };
export type { PlayerState };

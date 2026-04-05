import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';

interface Challenge {
  id: string;
  creator_id: string;
  opponent_id: string;
  type: string;
  target: number;
  creator_progress: number;
  opponent_progress: number;
  status: string;
  winner_id: string | null;
  gold_wager: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  creator_profile?: { username: string; level: number };
  opponent_profile?: { username: string; level: number };
}

interface ChallengesState {
  active: Challenge[];
  pending: Challenge[];
  completed: Challenge[];
  isLoading: boolean;
}

export const challengesStore$ = observable<ChallengesState>({
  active: [],
  pending: [],
  completed: [],
  isLoading: false,
});

export async function fetchChallenges() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  challengesStore$.isLoading.set(true);
  try {
    const { data } = await supabase
      .from('challenges')
      .select(
        '*, creator_profile:profiles!challenges_creator_id_fkey(username, level), opponent_profile:profiles!challenges_opponent_id_fkey(username, level)',
      )
      .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    const challenges = (data ?? []) as unknown as Challenge[];

    challengesStore$.active.set(challenges.filter((c) => c.status === 'active'));
    challengesStore$.pending.set(
      challenges.filter((c) => c.status === 'pending'),
    );
    challengesStore$.completed.set(
      challenges.filter((c) => c.status === 'completed'),
    );
  } finally {
    challengesStore$.isLoading.set(false);
  }
}

export async function createChallenge(
  opponentId: string,
  type: string,
  target: number,
  goldWager: number,
  durationDays: number,
) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const now = new Date();
  const endsAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const { error } = await supabase.from('challenges').insert({
    creator_id: userId,
    opponent_id: opponentId,
    type,
    target,
    gold_wager: goldWager,
    starts_at: now.toISOString(),
    ends_at: endsAt.toISOString(),
  });

  if (error) throw error;
  await fetchChallenges();
}

export async function respondToChallenge(challengeId: string, accept: boolean) {
  if (accept) {
    const { error } = await supabase
      .from('challenges')
      .update({ status: 'active' })
      .eq('id', challengeId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('challenges')
      .update({ status: 'cancelled' })
      .eq('id', challengeId);
    if (error) throw error;
  }
  await fetchChallenges();
}

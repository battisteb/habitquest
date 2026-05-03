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

export async function updateChallengeProgress(
  userId: string,
  xpEarned: number,
  completionCount: number = 1,
): Promise<void> {
  // Skip DB query if no active challenges in local store
  if (challengesStore$.active.get().length === 0) return;

  const { data: challenges } = await supabase
    .from('challenges')
    .select('id, type, target, creator_id, creator_progress, opponent_id, opponent_progress, gold_wager')
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .eq('status', 'active');

  if (!challenges?.length) return;

  for (const challenge of challenges) {
    const isCreator = challenge.creator_id === userId;
    const currentProgress = isCreator ? challenge.creator_progress : challenge.opponent_progress;
    const increment = challenge.type === 'xp_race' ? xpEarned : completionCount;
    const newProgress = currentProgress + increment;
    const progressField = isCreator ? 'creator_progress' : 'opponent_progress';

    const updates: Record<string, unknown> = { [progressField]: newProgress };

    if (newProgress >= challenge.target) {
      const opponentProgress = isCreator ? challenge.opponent_progress : challenge.creator_progress;
      const opponentAlreadyWon = opponentProgress >= challenge.target;
      if (!opponentAlreadyWon) {
        updates.status = 'completed';
        updates.winner_id = userId;
        const loserId = isCreator ? challenge.opponent_id : challenge.creator_id;
        const wager = challenge.gold_wager ?? 0;
        if (wager > 0) {
          await supabase.rpc('add_gold', { p_user_id: userId, p_amount: wager });
          await supabase.rpc('add_gold', { p_user_id: loserId, p_amount: -wager });
        }
        // Notify both players
        const notifType = 'challenge_completed';
        await supabase.rpc('create_notification', {
          p_user_id: userId,
          p_type: notifType,
          p_title: '🏆 Challenge Won!',
          p_body: `You won the ${challenge.type === 'xp_race' ? 'XP Race' : 'completion'} challenge and earned ${wager}g!`,
          p_data: { route: '/(tabs)/social', challengeId: challenge.id },
        });
        await supabase.rpc('create_notification', {
          p_user_id: loserId,
          p_type: notifType,
          p_title: '⚔️ Challenge Lost',
          p_body: `Your opponent won the ${challenge.type === 'xp_race' ? 'XP Race' : 'completion'} challenge.${wager > 0 ? ` You lost ${wager}g.` : ''}`,
          p_data: { route: '/(tabs)/social', challengeId: challenge.id },
        });
      }
    }

    await supabase.from('challenges').update(updates).eq('id', challenge.id);
  }
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

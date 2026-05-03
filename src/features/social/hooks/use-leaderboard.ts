import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';

export interface StreakLeaderEntry {
  id: string;
  username: string;
  level: number;
  bestStreak: number;
  isCurrentUser: boolean;
}

interface LeaderboardEntry {
  id: string;
  username: string;
  xp: number;
  level: number;
  rank: string;
  isCurrentUser: boolean;
}

export function useLeaderboard(scope: 'friends' | 'global' = 'friends') {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [scope]);

  async function loadLeaderboard() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    setIsLoading(true);
    try {
      let profileQuery = supabase
        .from('profiles')
        .select('id, username, xp, level, rank')
        .order('xp', { ascending: false });

      if (scope === 'friends') {
        // Get friend IDs
        const { data: asRequester } = await supabase
          .from('friendships')
          .select('addressee_id')
          .eq('requester_id', userId)
          .eq('status', 'accepted');

        const { data: asAddressee } = await supabase
          .from('friendships')
          .select('requester_id')
          .eq('addressee_id', userId)
          .eq('status', 'accepted');

        const friendIds = [
          ...(asRequester ?? []).map((f) => f.addressee_id),
          ...(asAddressee ?? []).map((f) => f.requester_id),
          userId,
        ];

        profileQuery = profileQuery.in('id', friendIds);
      } else {
        // Global top 50
        profileQuery = profileQuery.limit(50);
      }

      const { data: profiles } = await profileQuery;

      setEntries(
        (profiles ?? []).map((p) => ({
          ...p,
          rank: p.rank ?? 'Novice',
          isCurrentUser: p.id === userId,
        })),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { entries, isLoading, refresh: loadLeaderboard };
}

export function useStreakLeaderboard() {
  const [entries, setEntries] = useState<StreakLeaderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStreakLeaderboard();
  }, []);

  async function loadStreakLeaderboard() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    setIsLoading(true);
    try {
      const { data: asRequester } = await supabase
        .from('friendships')
        .select('addressee_id')
        .eq('requester_id', userId)
        .eq('status', 'accepted');

      const { data: asAddressee } = await supabase
        .from('friendships')
        .select('requester_id')
        .eq('addressee_id', userId)
        .eq('status', 'accepted');

      const friendIds = [
        ...(asRequester ?? []).map((f) => f.addressee_id),
        ...(asAddressee ?? []).map((f) => f.requester_id),
        userId,
      ];

      // Use denormalized best_streak on profiles — no habits RLS bypass needed
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, level, best_streak')
        .in('id', friendIds)
        .order('best_streak', { ascending: false })
        .limit(10) as unknown as { data: Array<{ id: string; username: string; level: number; best_streak: number }> | null };

      setEntries(
        (profiles ?? []).map((p) => ({
          id: p.id,
          username: p.username,
          level: p.level,
          bestStreak: p.best_streak ?? 0,
          isCurrentUser: p.id === userId,
        })),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { entries, isLoading, refresh: loadStreakLeaderboard };
}

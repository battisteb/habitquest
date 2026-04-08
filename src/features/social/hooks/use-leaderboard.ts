import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';

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

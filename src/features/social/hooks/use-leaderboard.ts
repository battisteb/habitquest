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

export function useLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    setIsLoading(true);
    try {
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

      // Get profiles for all friends + self
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, xp, level, rank')
        .in('id', friendIds)
        .order('xp', { ascending: false });

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

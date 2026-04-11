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
      // Get friend IDs (both sides of friendships)
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

      // Get profiles for all friend IDs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, level')
        .in('id', friendIds);

      if (!profiles || profiles.length === 0) {
        setEntries([]);
        return;
      }

      const profileIds = profiles.map((p) => p.id);

      // Get all habits for these users in one query
      const { data: habits } = await supabase
        .from('habits')
        .select('id, user_id')
        .in('user_id', profileIds)
        .eq('is_archived', false);

      const allHabitIds = (habits ?? []).map((h) => h.id);

      // Map habit_id -> user_id for aggregation
      const habitToUser: Record<string, string> = {};
      (habits ?? []).forEach((h) => {
        habitToUser[h.id] = h.user_id;
      });

      // Get all streaks for those habits in one query
      const streaksByUser: Record<string, number> = {};

      if (allHabitIds.length > 0) {
        const { data: streaks } = await supabase
          .from('streaks')
          .select('habit_id, current_count')
          .in('habit_id', allHabitIds);

        (streaks ?? []).forEach((s) => {
          const uid = habitToUser[s.habit_id];
          if (uid !== undefined) {
            const current = streaksByUser[uid] ?? 0;
            if (s.current_count > current) {
              streaksByUser[uid] = s.current_count;
            }
          }
        });
      }

      // Build sorted leaderboard (top 10)
      const result: StreakLeaderEntry[] = profiles
        .map((p) => ({
          id: p.id,
          username: p.username,
          level: p.level,
          bestStreak: streaksByUser[p.id] ?? 0,
          isCurrentUser: p.id === userId,
        }))
        .sort((a, b) => b.bestStreak - a.bestStreak)
        .slice(0, 10);

      setEntries(result);
    } finally {
      setIsLoading(false);
    }
  }

  return { entries, isLoading, refresh: loadStreakLeaderboard };
}

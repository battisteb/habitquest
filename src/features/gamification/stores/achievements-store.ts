import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import type { Database } from '../../../lib/supabase/types';

type Achievement = Database['public']['Tables']['achievements']['Row'];

interface AchievementWithStatus extends Achievement {
  isUnlocked: boolean;
  unlockedAt: string | null;
  currentValue: number;
}

interface AchievementsState {
  achievements: AchievementWithStatus[];
  isLoading: boolean;
  newlyUnlocked: AchievementWithStatus[];
}

export const achievementsStore$ = observable<AchievementsState>({
  achievements: [],
  isLoading: false,
  newlyUnlocked: [],
});

export async function fetchAchievements() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  achievementsStore$.isLoading.set(true);
  try {
    // Fetch all achievements
    const { data: allAchievements } = await supabase
      .from('achievements')
      .select('*')
      .order('category')
      .order('threshold');

    // Fetch user unlocks
    const { data: unlocked } = await supabase
      .from('user_achievements')
      .select('achievement_id, unlocked_at')
      .eq('user_id', userId);

    const unlockedMap = new Map(
      (unlocked ?? []).map((u) => [u.achievement_id, u.unlocked_at]),
    );

    // Fetch current user stats for progress bars
    const [profileRes, habitsRes] = await Promise.all([
      supabase.from('profiles').select('xp, level').eq('id', userId).single(),
      supabase.from('habits').select('id').eq('user_id', userId),
    ]);

    const habitIds = habitsRes.data?.map((h) => h.id) ?? [];

    const [streaksRes, completionsRes, friendsRes1, friendsRes2, purchasesRes] =
      await Promise.all([
        habitIds.length > 0
          ? supabase.from('streaks').select('current_count, longest_count').in('habit_id', habitIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('completions')
          .select('*', { count: 'exact', head: true })
          .in('habit_id', habitIds),
        supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('requester_id', userId)
          .eq('status', 'accepted'),
        supabase
          .from('friendships')
          .select('*', { count: 'exact', head: true })
          .eq('addressee_id', userId)
          .eq('status', 'accepted'),
        supabase
          .from('purchases')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId),
      ]);

    const bestStreak = Math.max(
      0,
      ...((streaksRes.data ?? []).map((s) =>
        Math.max(s.current_count ?? 0, s.longest_count ?? 0),
      )),
    );

    const statsMap: Record<string, number> = {
      streak: bestStreak,
      completion: completionsRes.count ?? 0,
      xp: profileRes.data?.xp ?? 0,
      social: (friendsRes1.count ?? 0) + (friendsRes2.count ?? 0),
      shop: purchasesRes.count ?? 0,
    };

    const withStatus: AchievementWithStatus[] = (allAchievements ?? []).map((a) => {
      let currentValue = 0;
      if (a.category === 'special') {
        currentValue = a.key?.startsWith('level_') ? (profileRes.data?.level ?? 0) : 0;
      } else {
        currentValue = statsMap[a.category] ?? 0;
      }

      return {
        ...a,
        isUnlocked: unlockedMap.has(a.id),
        unlockedAt: unlockedMap.get(a.id) ?? null,
        currentValue,
      };
    });

    achievementsStore$.achievements.set(withStatus);
  } finally {
    achievementsStore$.isLoading.set(false);
  }
}

export async function checkAndUnlockAchievements() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  // Gather user stats
  const { data: profile } = await supabase
    .from('profiles')
    .select('xp, level')
    .eq('id', userId)
    .single();

  const { count: totalCompletions } = await supabase
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .in(
      'habit_id',
      (
        await supabase.from('habits').select('id').eq('user_id', userId)
      ).data?.map((h) => h.id) ?? [],
    );

  // Get best streak
  const { data: streaks } = await supabase
    .from('streaks')
    .select('current_count, longest_count')
    .in(
      'habit_id',
      (
        await supabase.from('habits').select('id').eq('user_id', userId)
      ).data?.map((h) => h.id) ?? [],
    );

  const bestStreak = Math.max(
    0,
    ...(streaks ?? []).map((s) => Math.max(s.current_count, s.longest_count)),
  );

  // Get friend count
  const { count: friendCount1 } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('requester_id', userId)
    .eq('status', 'accepted');

  const { count: friendCount2 } = await supabase
    .from('friendships')
    .select('*', { count: 'exact', head: true })
    .eq('addressee_id', userId)
    .eq('status', 'accepted');

  const friendCount = (friendCount1 ?? 0) + (friendCount2 ?? 0);

  // Get purchase count
  const { count: purchaseCount } = await supabase
    .from('purchases')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get equipped count
  const { count: equippedCount } = await supabase
    .from('equipped_items')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get already unlocked
  const { data: unlocked } = await supabase
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  const unlockedIds = new Set((unlocked ?? []).map((u) => u.achievement_id));

  // Get all achievements
  const { data: allAchievements } = await supabase
    .from('achievements')
    .select('*');

  const statsMap: Record<string, number> = {
    streak: bestStreak,
    completion: totalCompletions ?? 0,
    xp: profile?.xp ?? 0,
    social: friendCount,
    shop: purchaseCount ?? 0,
  };

  const newlyUnlocked: AchievementWithStatus[] = [];

  for (const a of allAchievements ?? []) {
    if (unlockedIds.has(a.id)) continue;

    let currentValue = 0;

    if (a.category === 'special') {
      if (a.key.startsWith('level_')) {
        currentValue = profile?.level ?? 0;
      } else {
        continue;
      }
    } else if (a.key === 'equip_full') {
      currentValue = equippedCount ?? 0;
    } else {
      currentValue = statsMap[a.category] ?? 0;
    }

    if (currentValue >= a.threshold) {
      // Unlock!
      await supabase.from('user_achievements').insert({
        user_id: userId,
        achievement_id: a.id,
      });

      // Award XP and gold rewards
      if (a.xp_reward > 0) {
        await supabase.rpc('increment_xp', {
          user_id: userId,
          xp_amount: a.xp_reward,
        });
      }
      if (a.gold_reward > 0) {
        await supabase.rpc('add_gold', {
          p_user_id: userId,
          p_amount: a.gold_reward,
        });
      }

      newlyUnlocked.push({
        ...a,
        isUnlocked: true,
        unlockedAt: new Date().toISOString(),
        currentValue: a.threshold,
      });
    }
  }

  if (newlyUnlocked.length > 0) {
    achievementsStore$.newlyUnlocked.set(newlyUnlocked);
    await fetchAchievements();
  }
}

export function clearNewlyUnlocked() {
  achievementsStore$.newlyUnlocked.set([]);
}

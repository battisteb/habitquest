import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { persistPlugin } from '../../../lib/storage/persist';
import type { Database } from '../../../lib/supabase/types';
import { resetOnSignOut } from '../../../lib/storage/user-data';

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

const initialState = (): AchievementsState => ({
  achievements: [],
  isLoading: false,
  newlyUnlocked: [],
});

export const achievementsStore$ = observable<AchievementsState>(initialState());

resetOnSignOut(achievementsStore$, initialState);

syncObservable(achievementsStore$, {
  persist: {
    name: 'habitquest_achievements',
    plugin: persistPlugin,
  },
});

/** Shape of public.check_achievements() (supabase/migrations/20261001120000_server_achievements.sql). */
interface CheckResult {
  new: string[];
  achievements: (Achievement & { is_unlocked: boolean; unlocked_at: string | null; current_value: number })[];
}

/**
 * The server computes progress, unlocks what is earned (rewards come from a
 * trigger) and returns every achievement. Returns the ones just unlocked.
 */
async function syncAchievements(): Promise<AchievementWithStatus[]> {
  const { data, error } = await supabase.rpc('check_achievements');
  if (error) throw error;
  const result = data as unknown as CheckResult;

  const withStatus: AchievementWithStatus[] = result.achievements.map(
    ({ is_unlocked, unlocked_at, current_value, ...a }) => ({
      ...a,
      isUnlocked: is_unlocked,
      unlockedAt: unlocked_at,
      currentValue: current_value,
    }),
  );
  achievementsStore$.achievements.set(withStatus);

  const fresh = new Set(result.new);
  return withStatus.filter((a) => fresh.has(a.id));
}

export async function fetchAchievements() {
  if (!authStore$.user.get()?.id) return;

  achievementsStore$.isLoading.set(true);
  try {
    await syncAchievements();
  } finally {
    achievementsStore$.isLoading.set(false);
  }
}

/** Call after anything that can earn an achievement (quest, purchase, new friend…). */
export async function checkAndUnlockAchievements() {
  if (!authStore$.user.get()?.id) return;

  const newlyUnlocked = await syncAchievements();
  if (newlyUnlocked.length > 0) {
    achievementsStore$.newlyUnlocked.set(newlyUnlocked);
  }
}

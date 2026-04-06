import { observable, when } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { calculateNewStreak } from '../utils/streak-calculator';
import { calculateXpEarned } from '../../../lib/constants/game-config';
import { checkAndUnlockAchievements } from '../../gamification/stores/achievements-store';
import { updateQuestProgress } from '../../daily-quests/stores/daily-quests-store';
import { checkAndApplyPunishments } from '../utils/streak-punishment';
import { triggerLevelUp } from '../../gamification/stores/level-up-store';
import { getLevelForXp } from '../../../lib/constants/game-config';
import type { HabitContent } from '../types/habit-content';
import type { Database } from '../../../lib/supabase/types';

type Habit = Database['public']['Tables']['habits']['Row'] & { content?: HabitContent | null };
type Streak = Database['public']['Tables']['streaks']['Row'];
type Completion = Database['public']['Tables']['completions']['Row'];

interface HabitsState {
  habits: Habit[];
  streaks: Record<string, Streak>;
  todayCompletions: Record<string, boolean>;
  isLoading: boolean;
}

export const habitsStore$ = observable<HabitsState>({
  habits: [],
  streaks: {},
  todayCompletions: {},
  isLoading: false,
});

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function fetchHabits() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  habitsStore$.isLoading.set(true);
  try {
    const { data: habits } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('created_at', { ascending: true });

    if (!habits) return;
    habitsStore$.habits.set(habits);

    // Fetch streaks for all habits
    const habitIds = habits.map((h) => h.id);
    if (habitIds.length > 0) {
      const { data: streaks } = await supabase
        .from('streaks')
        .select('*')
        .in('habit_id', habitIds);

      const streakMap: Record<string, Streak> = {};
      streaks?.forEach((s) => {
        streakMap[s.habit_id] = s;
      });
      habitsStore$.streaks.set(streakMap);

      // Fetch today's completions
      const { data: completions } = await supabase
        .from('completions')
        .select('*')
        .in('habit_id', habitIds)
        .gte('completed_at', todayStart());

      const completionMap: Record<string, boolean> = {};
      completions?.forEach((c) => {
        completionMap[c.habit_id] = true;
      });
      habitsStore$.todayCompletions.set(completionMap);

      // Check for broken streaks and apply punishment (non-blocking)
      checkAndApplyPunishments(userId, streakMap).catch(() => {});
    }
  } finally {
    habitsStore$.isLoading.set(false);
  }
}

export async function createHabit(name: string, category: string, content?: HabitContent | null) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { data: habit, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name, category, content: content ?? null })
    .select()
    .single();

  if (error) throw error;

  // Create initial streak record
  await supabase.from('streaks').insert({ habit_id: habit.id });

  await fetchHabits();
}

export async function updateHabit(id: string, updates: { name?: string; category?: string; content?: HabitContent | null }) {
  const { error } = await supabase.from('habits').update(updates).eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function archiveHabit(id: string) {
  const { error } = await supabase.from('habits').update({ is_archived: true }).eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function pauseHabit(id: string) {
  const { error } = await (supabase.from('habits') as any)
    .update({ is_paused: true, paused_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function resumeHabit(id: string) {
  const { error } = await (supabase.from('habits') as any)
    .update({ is_paused: false, paused_at: null })
    .eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function completeHabit(habitId: string) {
  // Already completed today?
  if (habitsStore$.todayCompletions.get()[habitId]) return;

  const streak = habitsStore$.streaks.get()[habitId];
  const currentCount = streak?.current_count ?? 0;
  const longestCount = streak?.longest_count ?? 0;
  const lastCompletedAt = streak?.last_completed_at ?? null;

  // Calculate new streak
  const newStreak = calculateNewStreak(currentCount, longestCount, lastCompletedAt);
  const xpEarned = calculateXpEarned(newStreak.currentCount);

  const now = new Date().toISOString();

  // Insert completion
  await supabase.from('completions').insert({
    habit_id: habitId,
    xp_earned: xpEarned,
  });

  // Update streak
  await supabase
    .from('streaks')
    .update({
      current_count: newStreak.currentCount,
      longest_count: newStreak.longestCount,
      last_completed_at: now,
    })
    .eq('habit_id', habitId);

  // Update profile XP and detect level-up
  const userId = authStore$.user.get()?.id;
  if (userId) {
    // Get current XP before increment for level-up detection
    const { data: profileBefore } = await supabase
      .from('profiles')
      .select('xp')
      .eq('id', userId)
      .single();

    await supabase.rpc('increment_xp' as never, {
      user_id: userId,
      xp_amount: xpEarned,
    } as never);

    // Check for level-up
    if (profileBefore) {
      const oldLevel = getLevelForXp(profileBefore.xp);
      const newLevel = getLevelForXp(profileBefore.xp + xpEarned);
      if (newLevel > oldLevel) {
        triggerLevelUp(newLevel);
      }
    }
  }

  // Optimistic update
  habitsStore$.todayCompletions[habitId].set(true);
  if (streak) {
    habitsStore$.streaks[habitId].set({
      ...streak,
      current_count: newStreak.currentCount,
      longest_count: newStreak.longestCount,
      last_completed_at: now,
    });
  }

  // Check achievements in background (non-blocking)
  checkAndUnlockAchievements().catch(() => {});

  // Update daily quest progress (non-blocking)
  const habit = habitsStore$.habits.get().find((h) => h.id === habitId);
  updateQuestProgress('complete_habits').catch(() => {});
  if (habit?.category) {
    updateQuestProgress('complete_category', habit.category).catch(() => {});
  }
  updateQuestProgress('earn_xp', undefined, xpEarned).catch(() => {});
  updateQuestProgress('maintain_streak').catch(() => {});
}

import { observable, when } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { persistPlugin } from '../../../lib/storage/persist';
import { authStore$ } from '../../auth/stores/auth-store';
import { calculateNewStreak } from '../utils/streak-calculator';
import { calculateXpEarned, calculateGoldEarned } from '../../../lib/constants/game-config';
import { checkAndUnlockAchievements } from '../../gamification/stores/achievements-store';
import { updateQuestProgress } from '../../daily-quests/stores/daily-quests-store';
import { checkAndApplyPunishments } from '../utils/streak-punishment';
import { triggerLevelUp } from '../../gamification/stores/level-up-store';
import { triggerStreakMilestone, isMilestone } from '../../gamification/stores/streak-milestone-store';
import { recordCompletionHour } from '../../notifications/utils/adaptive-timing';
import { hapticSuccess, hapticHeavy } from '../../../lib/haptics';
import { refreshProfile } from '../../gamification/stores/profile-store';
import { getLevelForXp } from '../../../lib/constants/game-config';
import type { HabitContent } from '../types/habit-content';
import type { Database, Json } from '../../../lib/supabase/types';
import { reportBrokenStreaks } from './broken-streak-store';

type Habit = Omit<Database['public']['Tables']['habits']['Row'], 'content'> & { content?: HabitContent | null };
type Streak = Database['public']['Tables']['streaks']['Row'];
type Completion = Database['public']['Tables']['completions']['Row'];

interface HabitsState {
  habits: Habit[];
  streaks: Record<string, Streak>;
  todayCompletions: Record<string, boolean>;
  weekCompletions: Record<string, number>;
  isLoading: boolean;
}

export const habitsStore$ = observable<HabitsState>({
  habits: [],
  streaks: {},
  todayCompletions: {},
  weekCompletions: {},
  isLoading: false,
});

syncObservable(habitsStore$, {
  persist: {
    name: 'habitquest_habits',
    plugin: persistPlugin,
  },
});

function todayStart(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function weekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 1=Mon...
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function getWeeklyTarget(frequency: string): number {
  const map: Record<string, number> = {
    daily: 1, '2x_week': 2, '3x_week': 3, '4x_week': 4, '5x_week': 5,
  };
  return map[frequency] ?? 1;
}

export function isHabitCompletedEnough(habitId: string): boolean {
  const habit = habitsStore$.habits.get().find((h) => h.id === habitId);
  const frequency = habit?.frequency ?? 'daily';
  if (frequency === 'daily') {
    return !!habitsStore$.todayCompletions.get()[habitId];
  }
  const count = habitsStore$.weekCompletions.get()[habitId] ?? 0;
  return count >= getWeeklyTarget(frequency);
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
    habitsStore$.habits.set(habits as unknown as Habit[]);

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

      // Fetch this week's completions
      const { data: weekCompletionsData } = await supabase
        .from('completions')
        .select('habit_id')
        .in('habit_id', habitIds)
        .gte('completed_at', weekStart());

      const weekCompletionMap: Record<string, number> = {};
      weekCompletionsData?.forEach((c) => {
        weekCompletionMap[c.habit_id] = (weekCompletionMap[c.habit_id] ?? 0) + 1;
      });
      habitsStore$.weekCompletions.set(weekCompletionMap);

      // Check for broken streaks and apply punishment (non-blocking)
      checkAndApplyPunishments(userId, streakMap).then(({ brokenStreaks }) => {
        if (brokenStreaks.length > 0) {
          const habitsArr = habitsStore$.habits.get();
          reportBrokenStreaks(
            brokenStreaks.map((b) => ({
              habitId: b.habitId,
              wasCount: b.wasCount,
              habitName: habitsArr.find((h) => h.id === b.habitId)?.name ?? '',
            })),
          );
        }
      }).catch(() => {});
    }
  } finally {
    habitsStore$.isLoading.set(false);
  }
}

export async function createHabit(name: string, category: string, content?: HabitContent | null, frequency?: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { data: habit, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name, category, content: (content ?? null) as Json | null, frequency: frequency ?? 'daily' })
    .select()
    .single();

  if (error) throw error;

  // Create initial streak record
  await supabase.from('streaks').insert({ habit_id: habit.id });

  await fetchHabits();
}

export async function updateHabit(id: string, updates: { name?: string; category?: string; content?: HabitContent | null; frequency?: string }) {
  const { error } = await supabase.from('habits').update({ ...updates, content: updates.content as Json | null | undefined }).eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function archiveHabit(id: string) {
  const { error } = await supabase.from('habits').update({ is_archived: true }).eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function unarchiveHabit(id: string) {
  const { error } = await supabase.from('habits').update({ is_archived: false }).eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function deleteHabitPermanently(id: string) {
  await supabase.from('completions').delete().eq('habit_id', id);
  await supabase.from('streaks').delete().eq('habit_id', id);
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function pauseHabit(id: string) {
  const { error } = await supabase
    .from('habits')
    .update({ is_paused: true, paused_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function resumeHabit(id: string) {
  const { error } = await supabase
    .from('habits')
    .update({ is_paused: false, paused_at: null })
    .eq('id', id);
  if (error) throw error;
  await fetchHabits();
}

export async function completeHabit(habitId: string) {
  const habit = habitsStore$.habits.get().find((h) => h.id === habitId);
  const frequency = habit?.frequency ?? 'daily';

  if (frequency === 'daily') {
    // Already completed today?
    if (habitsStore$.todayCompletions.get()[habitId]) return;
  } else {
    // Already hit weekly target?
    const weekCount = habitsStore$.weekCompletions.get()[habitId] ?? 0;
    if (weekCount >= getWeeklyTarget(frequency)) return;
  }

  const streak = habitsStore$.streaks.get()[habitId];
  const currentCount = streak?.current_count ?? 0;
  const longestCount = streak?.longest_count ?? 0;
  const lastCompletedAt = streak?.last_completed_at ?? null;

  // Calculate new streak
  const newStreak = calculateNewStreak(currentCount, longestCount, lastCompletedAt);
  const xpEarned = calculateXpEarned(newStreak.currentCount);
  const goldEarned = calculateGoldEarned(xpEarned);

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

    await supabase.rpc('increment_xp', {
      user_id: userId,
      xp_amount: xpEarned,
    });

    if (goldEarned > 0) {
      await supabase.rpc('add_gold', {
        p_user_id: userId,
        p_amount: goldEarned,
      });
    }

    // Check for level-up
    if (profileBefore) {
      const oldLevel = getLevelForXp(profileBefore.xp);
      const newLevel = getLevelForXp(profileBefore.xp + xpEarned);
      if (newLevel > oldLevel) {
        triggerLevelUp(newLevel);
      }
    }
  }

  // Check for streak milestone
  if (isMilestone(newStreak.currentCount) && newStreak.currentCount > currentCount) {
    const habitName = habit?.name ?? '';
    triggerStreakMilestone(newStreak.currentCount, habitName);
    hapticHeavy();
  } else {
    hapticSuccess();
  }

  // Optimistic update
  habitsStore$.todayCompletions[habitId].set(true);
  const prevWeekCount = habitsStore$.weekCompletions.get()[habitId] ?? 0;
  habitsStore$.weekCompletions[habitId].set(prevWeekCount + 1);
  recordCompletionHour();
  refreshProfile();
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
  updateQuestProgress('complete_habits').catch(() => {});
  if (habit?.category) {
    updateQuestProgress('complete_category', habit.category).catch(() => {});
  }
  updateQuestProgress('earn_xp', undefined, xpEarned).catch(() => {});
  updateQuestProgress('maintain_streak').catch(() => {});
}

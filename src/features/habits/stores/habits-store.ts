import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { persistPlugin } from '../../../lib/storage/persist';
import { authStore$ } from '../../auth/stores/auth-store';
import { checkAndUnlockAchievements } from '../../gamification/stores/achievements-store';
import { fetchDailyQuests } from '../../daily-quests/stores/daily-quests-store';
import { fetchChallenges } from '../../social/stores/challenges-store';
import { checkAndApplyPunishments } from '../utils/streak-punishment';
import { triggerLevelUp } from '../../gamification/stores/level-up-store';
import { triggerStreakMilestone, isMilestone } from '../../gamification/stores/streak-milestone-store';
import { recordCompletionHour } from '../../notifications/utils/adaptive-timing';
import { hapticSuccess, hapticHeavy } from '../../../lib/haptics';
import { playSfx } from '../../../lib/audio/sound-service';
import { refreshProfile } from '../../gamification/stores/profile-store';
import type { HabitContent } from '../types/habit-content';
import type { Database, Json } from '../../../lib/supabase/types';
import { reportBrokenStreaks } from './broken-streak-store';
import { resetOnSignOut } from '../../../lib/storage/user-data';
import { showDialog } from '../../../lib/app-alert';
import { getStrings } from '../../../lib/i18n';

type Habit = Omit<Database['public']['Tables']['habits']['Row'], 'content'> & { content?: HabitContent | null };
type Streak = Database['public']['Tables']['streaks']['Row'];

interface HabitsState {
  habits: Habit[];
  streaks: Record<string, Streak>;
  todayCompletions: Record<string, boolean>;
  weekCompletions: Record<string, number>;
  isLoading: boolean;
}

const initialState = (): HabitsState => ({
  habits: [],
  streaks: {},
  todayCompletions: {},
  weekCompletions: {},
  isLoading: false,
});

export const habitsStore$ = observable<HabitsState>(initialState());

resetOnSignOut(habitsStore$, initialState);

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
  // "N times a week" = N different days: done for today once validated today.
  if (habitsStore$.todayCompletions.get()[habitId]) return true;
  const count = habitsStore$.weekCompletions.get()[habitId] ?? 0;
  return count >= getWeeklyTarget(frequency);
}

/** Active habits still to do today (same rule as the Quests tab badge). */
export function pendingHabitCount(): number {
  return habitsStore$.habits
    .get()
    .filter((h) => !(h as { is_paused?: boolean }).is_paused && !h.is_archived)
    .filter((h) => !isHabitCompletedEnough(h.id)).length;
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
      checkAndApplyPunishments().then(({ brokenStreaks, autoFrozenDays }) => {
        // A forgotten day was covered by a freeze: tell the player their streak is safe.
        if (autoFrozenDays.length > 0) {
          const T = getStrings();
          showDialog(
            T.freeze_auto_title,
            (autoFrozenDays.length === 1 ? T.freeze_auto_msg_one : T.freeze_auto_msg_many).replace('{n}', String(autoFrozenDays.length)),
          );
          refreshProfile();
        }
        if (brokenStreaks.length > 0) {
          for (const b of brokenStreaks) {
            if (habitsStore$.streaks[b.habitId].get()) {
              habitsStore$.streaks[b.habitId].current_count.set(0);
            }
          }
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

export async function createHabit(name: string, category: string, content?: HabitContent | null, frequency?: string, emoji?: string | null) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  // The streak row is created by the on_habit_created_streak trigger.
  const { error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name, category, content: (content ?? null) as Json | null, frequency: frequency ?? 'daily', emoji: emoji ?? null });

  if (error) throw error;

  await fetchHabits();
}

export async function updateHabit(id: string, updates: { name?: string; category?: string; content?: HabitContent | null; frequency?: string; emoji?: string | null }) {
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
  // Completions and streak are removed by ON DELETE CASCADE.
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

interface CompleteHabitResult {
  success: boolean;
  reason?: 'already_completed' | 'inactive';
  xp_earned: number;
  gold_earned: number;
  old_level: number;
  new_level: number;
  current_streak: number;
  longest_streak: number;
  previous_streak: number;
}

/** Completes a habit on the server; resolves with the rewards actually granted. */
export async function completeHabit(
  habitId: string,
  note?: string,
): Promise<CompleteHabitResult | undefined> {
  const habit = habitsStore$.habits.get().find((h) => h.id === habitId);
  const frequency = habit?.frequency ?? 'daily';

  if (frequency === 'daily') {
    // Already completed today?
    if (habitsStore$.todayCompletions.get()[habitId]) return;
  } else {
    // Already validated today, or weekly target already hit?
    if (habitsStore$.todayCompletions.get()[habitId]) return;
    const weekCount = habitsStore$.weekCompletions.get()[habitId] ?? 0;
    if (weekCount >= getWeeklyTarget(frequency)) return;
  }

  // XP, gold, streak, challenges and daily quests are all computed server-side.
  const { data, error } = await supabase.rpc('complete_habit', {
    p_habit_id: habitId,
    p_note: note ?? undefined,
  });
  if (error) throw error;
  const result = data as unknown as CompleteHabitResult;
  if (!result.success) {
    if (result.reason === 'already_completed') {
      habitsStore$.todayCompletions[habitId].set(true);
    }
    return undefined;
  }

  const pendingBefore = pendingHabitCount();
  const levelUp = result.new_level > result.old_level;
  if (levelUp) {
    triggerLevelUp(result.new_level);
  }

  // Check for streak milestone
  const milestone = isMilestone(result.current_streak) && result.current_streak > result.previous_streak;
  if (milestone) {
    triggerStreakMilestone(result.current_streak, habit?.name ?? '');
    hapticHeavy();
    void playSfx('streak_milestone');
  } else {
    hapticSuccess();
    void playSfx('complete', 0.6);
  }

  if (result.gold_earned > 0) {
    void playSfx('coin', 0.5);
  }

  // Mirror the server result locally
  habitsStore$.todayCompletions[habitId].set(true);
  const prevWeekCount = habitsStore$.weekCompletions.get()[habitId] ?? 0;
  habitsStore$.weekCompletions[habitId].set(prevWeekCount + 1);

  // Last quest of the day: a short fanfare after the completion sound,
  // unless a level-up or streak milestone already celebrates.
  if (pendingBefore > 0 && pendingHabitCount() === 0 && !levelUp && !milestone) {
    setTimeout(() => void playSfx('all_done', 0.8), 450);
  }
  recordCompletionHour();
  refreshProfile();
  const streak = habitsStore$.streaks.get()[habitId];
  if (streak) {
    habitsStore$.streaks[habitId].set({
      ...streak,
      current_count: result.current_streak,
      longest_count: result.longest_streak,
      last_completed_at: new Date().toISOString(),
    });
  }

  // Background refreshes (non-blocking)
  checkAndUnlockAchievements().catch(() => {});
  fetchDailyQuests().catch(() => {});
  fetchChallenges().catch(() => {});

  return result;
}

interface UncompleteHabitResult {
  success: boolean;
  reason?: 'not_completed_today';
  xp_lost: number;
  gold_lost: number;
  old_level: number;
  new_level: number;
  current_streak: number;
}

/**
 * Undoes today's validation of a habit tapped by mistake. The server takes
 * back everything it gave (XP, gold, streak, missions, challenges).
 */
export async function uncompleteHabit(habitId: string): Promise<UncompleteHabitResult | undefined> {
  if (!habitsStore$.todayCompletions.get()[habitId]) return;

  const { data, error } = await supabase.rpc('uncomplete_habit', { p_habit_id: habitId });
  if (error) throw error;
  const result = data as unknown as UncompleteHabitResult;
  if (!result.success) {
    if (result.reason === 'not_completed_today') habitsStore$.todayCompletions[habitId].set(false);
    return undefined;
  }

  habitsStore$.todayCompletions[habitId].set(false);
  const weekCount = habitsStore$.weekCompletions.get()[habitId] ?? 0;
  habitsStore$.weekCompletions[habitId].set(Math.max(0, weekCount - 1));
  const streak = habitsStore$.streaks.get()[habitId];
  if (streak) {
    habitsStore$.streaks[habitId].set({
      ...streak,
      current_count: result.current_streak,
      last_completed_at: result.current_streak > 0 ? streak.last_completed_at : null,
    });
  }

  refreshProfile();
  fetchDailyQuests().catch(() => {});
  fetchChallenges().catch(() => {});
  return result;
}

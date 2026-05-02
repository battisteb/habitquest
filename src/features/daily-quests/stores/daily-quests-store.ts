import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { persistPlugin } from '../../../lib/storage/persist';

export type QuestType = 'complete_habits' | 'complete_category' | 'earn_xp' | 'maintain_streak';
export type QuestDifficulty = 'easy' | 'normal' | 'hard';

export interface QuestTemplate {
  id: string;
  title: string;
  description: string;
  quest_type: QuestType;
  target_value: number;
  target_category: string | null;
  xp_reward: number;
  gold_reward: number;
  difficulty: QuestDifficulty;
  is_active: boolean;
}

export interface UserDailyQuest {
  id: string;
  user_id: string;
  template_id: string;
  assigned_date: string;
  current_progress: number;
  is_completed: boolean;
  is_claimed: boolean;
  completed_at: string | null;
  claimed_at: string | null;
}

export interface DailyQuestWithTemplate extends UserDailyQuest {
  template: QuestTemplate;
}

interface DailyQuestsState {
  quests: DailyQuestWithTemplate[];
  isLoading: boolean;
}

export const dailyQuestsStore$ = observable<DailyQuestsState>({
  quests: [],
  isLoading: false,
});

syncObservable(dailyQuestsStore$, {
  persist: {
    name: 'habitquest_daily_quests',
    plugin: persistPlugin,
  },
});

export async function fetchDailyQuests() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  dailyQuestsStore$.isLoading.set(true);
  try {
    // Call assign RPC to ensure quests exist for today
    await supabase.rpc('assign_daily_quests', {
      p_user_id: userId,
    });

    // Fetch today's quests with template join
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('user_daily_quests')
      .select('*, template:daily_quest_templates(*)')
      .eq('user_id', userId)
      .eq('assigned_date', today);

    if (error) throw error;

    const quests: DailyQuestWithTemplate[] = (data ?? []).map((row) => {
      const { template: rawTemplate, ...quest } = row as Record<string, unknown>;
      const template = rawTemplate as QuestTemplate;
      return {
        id: quest.id as string,
        user_id: quest.user_id as string,
        template_id: quest.template_id as string,
        assigned_date: quest.assigned_date as string,
        current_progress: quest.current_progress as number,
        is_completed: quest.is_completed as boolean,
        is_claimed: quest.is_claimed as boolean,
        completed_at: quest.completed_at as string | null,
        claimed_at: quest.claimed_at as string | null,
        template,
      };
    });

    // Sort by difficulty: easy, normal, hard
    const difficultyOrder: Record<QuestDifficulty, number> = { easy: 0, normal: 1, hard: 2 };
    quests.sort((a, b) => difficultyOrder[a.template.difficulty] - difficultyOrder[b.template.difficulty]);

    dailyQuestsStore$.quests.set(quests);
  } finally {
    dailyQuestsStore$.isLoading.set(false);
  }
}

export interface HabitsSnapshot {
  todayCompletions: Record<string, boolean>;
  habits: { id: string }[];
}

export async function updateQuestProgress(
  questType: QuestType,
  category?: string,
  value?: number,
  habitsSnapshot?: HabitsSnapshot,
) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const quests = dailyQuestsStore$.quests.get();
  if (quests.length === 0) return;

  for (const quest of quests) {
    if (quest.is_completed || quest.is_claimed) continue;
    if (quest.template.quest_type !== questType) continue;

    // For category quests, check if category matches
    if (
      questType === 'complete_category' &&
      quest.template.target_category &&
      quest.template.target_category !== category
    ) {
      continue;
    }

    let newProgress: number;

    if (questType === 'earn_xp') {
      // For XP quests, we accumulate the value
      newProgress = quest.current_progress + (value ?? 0);
    } else if (questType === 'maintain_streak') {
      // For streak quests, check if all habits have been completed today
      const todayCompletions = habitsSnapshot?.todayCompletions ?? {};
      const habits = habitsSnapshot?.habits ?? [];
      const allCompleted = habits.length > 0 && habits.every((h) => todayCompletions[h.id]);
      newProgress = allCompleted ? 1 : 0;
    } else {
      // For completion quests, increment by 1
      newProgress = quest.current_progress + 1;
    }

    const isNowCompleted = newProgress >= quest.template.target_value;
    const now = new Date().toISOString();

    // Update in database
    await supabase
      .from('user_daily_quests')
      .update({
        current_progress: newProgress,
        is_completed: isNowCompleted,
        completed_at: isNowCompleted ? now : null,
      })
      .eq('id', quest.id);

    // Optimistic update in store
    const questIndex = quests.findIndex((q) => q.id === quest.id);
    if (questIndex !== -1) {
      dailyQuestsStore$.quests[questIndex].current_progress.set(newProgress);
      if (isNowCompleted) {
        dailyQuestsStore$.quests[questIndex].is_completed.set(true);
        dailyQuestsStore$.quests[questIndex].completed_at.set(now);
      }
    }
  }
}

export async function claimQuest(questId: string) {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  const { data, error } = await supabase.rpc('claim_daily_quest', {
    p_user_id: userId,
    p_quest_id: questId,
  });

  if (error) throw error;

  const result = data as { success: boolean; error?: string; xp_awarded?: number; gold_awarded?: number };
  if (!result.success) {
    throw new Error(result.error ?? 'Failed to claim quest');
  }

  // Optimistic update
  const quests = dailyQuestsStore$.quests.get();
  const questIndex = quests.findIndex((q) => q.id === questId);
  if (questIndex !== -1) {
    dailyQuestsStore$.quests[questIndex].is_claimed.set(true);
    dailyQuestsStore$.quests[questIndex].claimed_at.set(new Date().toISOString());
  }

  return result;
}

import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { persistPlugin } from '../../../lib/storage/persist';
import { resetOnSignOut } from '../../../lib/storage/user-data';
import { playSfx } from '../../../lib/audio/sound-service';
import { localDateKey } from '../../../lib/local-date';
import { refreshProfile } from '../../gamification/stores/profile-store';

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

const initialState = (): DailyQuestsState => ({
  quests: [],
  isLoading: false,
});

export const dailyQuestsStore$ = observable<DailyQuestsState>(initialState());

resetOnSignOut(dailyQuestsStore$, initialState);

syncObservable(dailyQuestsStore$, {
  persist: {
    name: 'habitquest_daily_quests',
    plugin: persistPlugin,
  },
});

/**
 * A mission just completed (seen on refresh after a quest): a chime, or a
 * fanfare when it was the last one. Played after the quest's own sound.
 */
export function playMissionSounds(before: DailyQuestWithTemplate[], after: DailyQuestWithTemplate[]): void {
  const done = new Set(before.filter((q) => q.is_completed).map((q) => q.id));
  const known = new Set(before.map((q) => q.id));
  const newlyDone = after.filter((q) => q.is_completed && known.has(q.id) && !done.has(q.id));
  if (newlyDone.length === 0) return;
  const allDone = after.length > 0 && after.every((q) => q.is_completed);
  setTimeout(() => void playSfx(allDone ? 'missions_all' : 'mission_done', 0.8), 700);
}

export async function fetchDailyQuests() {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  dailyQuestsStore$.isLoading.set(true);
  try {
    // Call assign RPC to ensure quests exist for today
    await supabase.rpc('assign_daily_quests', {
      p_user_id: userId,
    });

    // Fetch today's quests with template join (the player's local day, like the server).
    const today = localDateKey();
    const before = dailyQuestsStore$.quests.get();
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
    playMissionSounds(before, quests);
  } finally {
    dailyQuestsStore$.isLoading.set(false);
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

  void playSfx('reward_coins', 0.8);

  // Optimistic update
  const quests = dailyQuestsStore$.quests.get();
  const questIndex = quests.findIndex((q) => q.id === questId);
  if (questIndex !== -1) {
    dailyQuestsStore$.quests[questIndex].is_claimed.set(true);
    dailyQuestsStore$.quests[questIndex].claimed_at.set(new Date().toISOString());
  }
  // The reward is on the server: show the new gold and XP right away.
  refreshProfile();

  return result;
}

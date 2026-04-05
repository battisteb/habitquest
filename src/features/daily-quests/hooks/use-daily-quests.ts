import { use$ } from '@legendapp/state/react';
import {
  dailyQuestsStore$,
  fetchDailyQuests,
  updateQuestProgress,
  claimQuest,
} from '../stores/daily-quests-store';
import type { DailyQuestWithTemplate, QuestType } from '../stores/daily-quests-store';

export function useDailyQuests() {
  const quests = use$(dailyQuestsStore$.quests) as DailyQuestWithTemplate[];
  const isLoading = use$(dailyQuestsStore$.isLoading) as boolean;

  return {
    quests,
    isLoading,
    fetchDailyQuests,
    updateQuestProgress,
    claimQuest,
  };
}

export type { DailyQuestWithTemplate, QuestType };

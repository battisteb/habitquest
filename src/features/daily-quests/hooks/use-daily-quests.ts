import { use$ } from '@legendapp/state/react';
import {
  dailyQuestsStore$,
  fetchDailyQuests,
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
    claimQuest,
  };
}

export type { DailyQuestWithTemplate, QuestType };

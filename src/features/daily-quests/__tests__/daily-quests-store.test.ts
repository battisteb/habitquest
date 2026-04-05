import { dailyQuestsStore$ } from '../stores/daily-quests-store';
import type { DailyQuestWithTemplate, QuestTemplate } from '../stores/daily-quests-store';

// Mock supabase
const mockRpc = jest.fn().mockResolvedValue({ data: null, error: null });
const mockFrom = jest.fn();

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

jest.mock('../../auth/stores/auth-store', () => ({
  authStore$: {
    user: { get: () => ({ id: 'user-123' }) },
  },
}));

jest.mock('../../habits/stores/habits-store', () => ({
  habitsStore$: {
    habits: { get: () => [] },
    todayCompletions: { get: () => ({}) },
  },
}));

function makeTemplate(overrides: Partial<QuestTemplate> = {}): QuestTemplate {
  return {
    id: 'tpl-1',
    title: 'Test Quest',
    description: 'A test quest',
    quest_type: 'complete_habits',
    target_value: 3,
    target_category: null,
    xp_reward: 25,
    gold_reward: 5,
    difficulty: 'normal',
    is_active: true,
    ...overrides,
  };
}

function makeQuest(overrides: Partial<DailyQuestWithTemplate> = {}): DailyQuestWithTemplate {
  return {
    id: 'quest-1',
    user_id: 'user-123',
    template_id: 'tpl-1',
    assigned_date: new Date().toISOString().split('T')[0],
    current_progress: 0,
    is_completed: false,
    is_claimed: false,
    completed_at: null,
    claimed_at: null,
    template: makeTemplate(),
    ...overrides,
  };
}

describe('dailyQuestsStore$', () => {
  beforeEach(() => {
    dailyQuestsStore$.quests.set([]);
    dailyQuestsStore$.isLoading.set(false);
    jest.clearAllMocks();
  });

  it('starts with empty quests', () => {
    expect(dailyQuestsStore$.quests.get()).toEqual([]);
  });

  it('starts with isLoading false', () => {
    expect(dailyQuestsStore$.isLoading.get()).toBe(false);
  });

  it('tracks loading state', () => {
    dailyQuestsStore$.isLoading.set(true);
    expect(dailyQuestsStore$.isLoading.get()).toBe(true);
  });

  it('can set quests', () => {
    const quest = makeQuest();
    dailyQuestsStore$.quests.set([quest]);
    expect(dailyQuestsStore$.quests.get()).toHaveLength(1);
    expect(dailyQuestsStore$.quests.get()[0].id).toBe('quest-1');
  });

  describe('fetchDailyQuests', () => {
    it('calls assign RPC and fetches quests', async () => {
      const today = new Date().toISOString().split('T')[0];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      // Final eq resolves with data
      mockChain.eq.mockImplementation(() => {
        // Second eq call returns the data
        if (mockChain.eq.mock.calls.length >= 2) {
          return Promise.resolve({
            data: [
              {
                id: 'quest-1',
                user_id: 'user-123',
                template_id: 'tpl-1',
                assigned_date: today,
                current_progress: 0,
                is_completed: false,
                is_claimed: false,
                completed_at: null,
                claimed_at: null,
                template: makeTemplate(),
              },
            ],
            error: null,
          });
        }
        return mockChain;
      });

      mockFrom.mockReturnValue(mockChain);

      const { fetchDailyQuests } = require('../stores/daily-quests-store');
      await fetchDailyQuests();

      expect(mockRpc).toHaveBeenCalledWith('assign_daily_quests', {
        p_user_id: 'user-123',
      });
    });

    it('sets isLoading during fetch', async () => {
      mockFrom.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const { fetchDailyQuests } = require('../stores/daily-quests-store');
      const promise = fetchDailyQuests();
      // isLoading should be true during fetch
      expect(dailyQuestsStore$.isLoading.get()).toBe(true);
      await promise;
      expect(dailyQuestsStore$.isLoading.get()).toBe(false);
    });
  });

  describe('updateQuestProgress', () => {
    it('increments progress for matching complete_habits quest', async () => {
      const quest = makeQuest({ current_progress: 1 });
      dailyQuestsStore$.quests.set([quest]);

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const { updateQuestProgress } = require('../stores/daily-quests-store');
      await updateQuestProgress('complete_habits');

      expect(dailyQuestsStore$.quests.get()[0].current_progress).toBe(2);
    });

    it('skips already completed quests', async () => {
      const quest = makeQuest({ is_completed: true, current_progress: 3 });
      dailyQuestsStore$.quests.set([quest]);

      const { updateQuestProgress } = require('../stores/daily-quests-store');
      await updateQuestProgress('complete_habits');

      // Should not have changed
      expect(dailyQuestsStore$.quests.get()[0].current_progress).toBe(3);
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it('skips category quests with non-matching category', async () => {
      const quest = makeQuest({
        template: makeTemplate({
          quest_type: 'complete_category',
          target_category: 'fitness',
          target_value: 1,
        }),
      });
      dailyQuestsStore$.quests.set([quest]);

      const { updateQuestProgress } = require('../stores/daily-quests-store');
      await updateQuestProgress('complete_category', 'learning');

      // Should not have changed
      expect(dailyQuestsStore$.quests.get()[0].current_progress).toBe(0);
    });

    it('marks quest as completed when target is reached', async () => {
      const quest = makeQuest({
        current_progress: 2,
        template: makeTemplate({ target_value: 3 }),
      });
      dailyQuestsStore$.quests.set([quest]);

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const { updateQuestProgress } = require('../stores/daily-quests-store');
      await updateQuestProgress('complete_habits');

      expect(dailyQuestsStore$.quests.get()[0].current_progress).toBe(3);
      expect(dailyQuestsStore$.quests.get()[0].is_completed).toBe(true);
    });

    it('accumulates XP for earn_xp quests', async () => {
      const quest = makeQuest({
        current_progress: 10,
        template: makeTemplate({
          quest_type: 'earn_xp',
          target_value: 50,
        }),
      });
      dailyQuestsStore$.quests.set([quest]);

      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });
      mockFrom.mockReturnValue({ update: mockUpdate });

      const { updateQuestProgress } = require('../stores/daily-quests-store');
      await updateQuestProgress('earn_xp', undefined, 15);

      expect(dailyQuestsStore$.quests.get()[0].current_progress).toBe(25);
    });
  });

  describe('claimQuest', () => {
    it('calls claim RPC and updates store', async () => {
      const quest = makeQuest({ is_completed: true });
      dailyQuestsStore$.quests.set([quest]);

      mockRpc.mockResolvedValueOnce({
        data: { success: true, xp_awarded: 25, gold_awarded: 5 },
        error: null,
      });

      const { claimQuest } = require('../stores/daily-quests-store');
      const result = await claimQuest('quest-1');

      expect(mockRpc).toHaveBeenCalledWith('claim_daily_quest', {
        p_user_id: 'user-123',
        p_quest_id: 'quest-1',
      });
      expect(result.success).toBe(true);
      expect(dailyQuestsStore$.quests.get()[0].is_claimed).toBe(true);
    });

    it('throws on failed claim', async () => {
      const quest = makeQuest();
      dailyQuestsStore$.quests.set([quest]);

      mockRpc.mockResolvedValueOnce({
        data: { success: false, error: 'Quest not yet completed' },
        error: null,
      });

      const { claimQuest } = require('../stores/daily-quests-store');
      await expect(claimQuest('quest-1')).rejects.toThrow('Quest not yet completed');
    });
  });
});

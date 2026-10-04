/**
 * Mission chest (G7, ADR 028): once the three missions are claimed, a chest
 * with a small reward drawn by the server; once a day.
 */
const mockRpc = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
const mockSfx = jest.fn();
jest.mock('../../../lib/audio/sound-service', () => ({ playSfx: (...a: unknown[]) => mockSfx(...a) }));
const mockRefresh = jest.fn();
jest.mock('../../gamification/stores/profile-store', () => ({ refreshProfile: () => mockRefresh() }));
const mockLevelUp = jest.fn();
jest.mock('../../gamification/stores/level-up-store', () => ({ triggerLevelUp: (n: number) => mockLevelUp(n) }));

import { chestReady, openChest, dailyQuestsStore$, type UserDailyQuest } from '../stores/daily-quests-store';
import { CHEST } from '../../../lib/constants/game-config';

const q = (claimed: boolean): UserDailyQuest => ({
  id: Math.random().toString(), user_id: 'me', template_id: 't', assigned_date: '2026-10-04',
  current_progress: 1, is_completed: true, is_claimed: claimed, completed_at: null, claimed_at: null,
});

describe('mission chest', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is ready once every mission is claimed, until opened that day', () => {
    expect(chestReady([q(true), q(true), q(false)], null)).toBe(false);
    expect(chestReady([q(true), q(true), q(true)], null)).toBe(true);
    expect(chestReady([q(true), q(true), q(true)], '2026-10-04')).toBe(false);
    expect(chestReady([q(true), q(true), q(true)], '2026-10-03')).toBe(true);
    expect(chestReady([], null)).toBe(false);
  });

  it('mirrors the server draw', () => {
    expect(CHEST.GOLD_CHANCE + CHEST.XP_CHANCE).toBeCloseTo(0.95);
    expect(CHEST.JACKPOT_GOLD).toBe(100);
  });

  it('lets the server pay and remembers it was opened', async () => {
    dailyQuestsStore$.quests.set([q(true), q(true), q(true)] as never);
    mockRpc.mockResolvedValue({ data: { success: true, gold: 32, xp: 0, jackpot: false, old_level: 4, new_level: 4 }, error: null });
    const r = await openChest();
    expect(mockRpc).toHaveBeenCalledWith('open_daily_chest');
    expect(r?.gold).toBe(32);
    expect(dailyQuestsStore$.chestOpenedOn.get()).toBe('2026-10-04');
    expect(mockSfx).toHaveBeenCalledWith('reward_coins', 0.9);
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockLevelUp).not.toHaveBeenCalled();
  });

  it('celebrates a level reached with chest XP', async () => {
    mockRpc.mockResolvedValue({ data: { success: true, gold: 0, xp: 50, jackpot: false, old_level: 4, new_level: 5 }, error: null });
    await openChest();
    expect(mockLevelUp).toHaveBeenCalledWith(5);
  });
});

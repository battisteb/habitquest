import {
  getFreezesRemaining,
  isFreezeActiveToday,
  activateFreeze,
  STREAK_FREEZE_CONFIG,
} from '../utils/streak-freeze';

// Mock MMKV storage
const mockStorage: Record<string, string> = {};
jest.mock('../../../lib/storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStorage[key] ?? undefined,
    set: (key: string, value: string) => {
      mockStorage[key] = value;
    },
  },
}));

const mockRpc = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

describe('streak-freeze', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
    mockRpc.mockReset();
    mockRpc.mockResolvedValue({ data: { success: true, source: 'weekly' }, error: null });
  });

  it('should have 1 freeze per week by default', () => {
    expect(STREAK_FREEZE_CONFIG.MAX_PER_WEEK).toBe(1);
  });

  it('should report 1 freeze remaining with no data', () => {
    expect(getFreezesRemaining()).toBe(1);
  });

  it('should not be active today with no data', () => {
    expect(isFreezeActiveToday()).toBe(false);
  });

  it('should activate freeze successfully', async () => {
    const result = await activateFreeze();
    expect(mockRpc).toHaveBeenCalledWith('activate_streak_freeze');
    expect(result).toBe(true);
    expect(isFreezeActiveToday()).toBe(true);
    expect(getFreezesRemaining()).toBe(0);
  });

  it('should return true when activating on same day (idempotent)', async () => {
    await activateFreeze();
    const result = await activateFreeze();
    expect(result).toBe(true);
    expect(mockRpc).toHaveBeenCalledTimes(1);
  });

  it('should not allow a freeze the server refuses', async () => {
    mockRpc.mockResolvedValue({ data: { success: false, reason: 'no_freeze_left' }, error: null });

    const result = await activateFreeze();
    expect(result).toBe(false);
    expect(isFreezeActiveToday()).toBe(false);
  });

  it('should reset counter on new week', async () => {
    await activateFreeze();
    // Simulate new week by changing weekStart
    const data = JSON.parse(mockStorage['streak-freeze']);
    data.weekStart = '2020-01-06';
    data.lastFreezeDate = '2020-01-06';
    mockStorage['streak-freeze'] = JSON.stringify(data);

    // Now getFreezesRemaining should reset since current week is different
    expect(getFreezesRemaining()).toBe(1);
  });
});

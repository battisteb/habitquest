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

describe('streak-freeze', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
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

  it('should activate freeze successfully', () => {
    const result = activateFreeze();
    expect(result).toBe(true);
    expect(isFreezeActiveToday()).toBe(true);
    expect(getFreezesRemaining()).toBe(0);
  });

  it('should return true when activating on same day (idempotent)', () => {
    activateFreeze();
    const result = activateFreeze();
    expect(result).toBe(true);
  });

  it('should not allow second freeze in same week', () => {
    activateFreeze();
    // Simulate a different day by directly manipulating storage
    const data = JSON.parse(mockStorage['streak-freeze']);
    data.lastFreezeDate = '2020-01-01'; // different day
    mockStorage['streak-freeze'] = JSON.stringify(data);

    const result = activateFreeze();
    expect(result).toBe(false);
  });

  it('should reset counter on new week', () => {
    activateFreeze();
    // Simulate new week by changing weekStart
    const data = JSON.parse(mockStorage['streak-freeze']);
    data.weekStart = '2020-01-06';
    data.lastFreezeDate = '2020-01-06';
    mockStorage['streak-freeze'] = JSON.stringify(data);

    // Now getFreezesRemaining should reset since current week is different
    expect(getFreezesRemaining()).toBe(1);
  });
});

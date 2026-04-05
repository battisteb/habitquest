import { calculatePunishment, PUNISHMENT_CONFIG } from '../utils/punishment';

describe('calculatePunishment', () => {
  it('returns 0 for streak of 0', () => {
    const result = calculatePunishment(0);
    expect(result.xpLoss).toBe(0);
    expect(result.goldLoss).toBe(0);
  });

  it('scales with streak count', () => {
    const result = calculatePunishment(5);
    expect(result.xpLoss).toBe(5 * PUNISHMENT_CONFIG.XP_LOSS_PER_STREAK_DAY);
    expect(result.goldLoss).toBe(5 * PUNISHMENT_CONFIG.GOLD_LOSS_PER_STREAK_DAY);
  });

  it('caps XP loss at max', () => {
    const result = calculatePunishment(999);
    expect(result.xpLoss).toBe(PUNISHMENT_CONFIG.MAX_XP_LOSS);
  });

  it('caps gold loss at max', () => {
    const result = calculatePunishment(999);
    expect(result.goldLoss).toBe(PUNISHMENT_CONFIG.MAX_GOLD_LOSS);
  });

  it('returns correct values at boundary', () => {
    const boundary = PUNISHMENT_CONFIG.MAX_XP_LOSS / PUNISHMENT_CONFIG.XP_LOSS_PER_STREAK_DAY;
    const result = calculatePunishment(boundary);
    expect(result.xpLoss).toBe(PUNISHMENT_CONFIG.MAX_XP_LOSS);
  });
});

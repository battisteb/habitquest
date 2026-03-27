import {
  calculateXpEarned,
  getLevelForXp,
  getXpForNextLevel,
} from '../../../lib/constants/game-config';

describe('calculateXpEarned', () => {
  it('gives base XP at streak 0', () => {
    expect(calculateXpEarned(0)).toBe(10);
  });

  it('increases XP with streak', () => {
    expect(calculateXpEarned(5)).toBe(15); // 10 * 1.5
  });

  it('caps multiplier at 5x', () => {
    expect(calculateXpEarned(100)).toBe(50); // 10 * 5 (capped)
  });
});

describe('getLevelForXp', () => {
  it('returns 0 for 0 XP', () => {
    expect(getLevelForXp(0)).toBe(0);
  });

  it('returns 1 at 100 XP', () => {
    expect(getLevelForXp(100)).toBe(1);
  });

  it('returns 2 at 250 XP', () => {
    expect(getLevelForXp(250)).toBe(2);
  });

  it('returns highest level for large XP', () => {
    expect(getLevelForXp(99999)).toBe(10);
  });
});

describe('getXpForNextLevel', () => {
  it('returns 100 for level 0', () => {
    expect(getXpForNextLevel(0)).toBe(100);
  });

  it('returns 250 for level 1', () => {
    expect(getXpForNextLevel(1)).toBe(250);
  });

  it('scales beyond defined thresholds', () => {
    const xp = getXpForNextLevel(15);
    expect(xp).toBeGreaterThan(6000);
  });
});

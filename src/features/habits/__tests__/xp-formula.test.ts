import {
  calculateXpEarned,
  getLevelForXp,
  getXpForLevel,
  getXpForNextLevel,
  getRankForLevel,
  calculateGoldEarned,
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
  it('starts players at level 1', () => {
    expect(getLevelForXp(0)).toBe(1);
  });

  it('returns 2 at 100 XP', () => {
    expect(getLevelForXp(100)).toBe(2);
  });

  it('returns 3 at 250 XP', () => {
    expect(getLevelForXp(250)).toBe(3);
  });

  it('reaches level 11 at 6000 XP', () => {
    expect(getLevelForXp(6000)).toBe(11);
  });

  it('keeps levelling every 2000 XP past the table', () => {
    expect(getLevelForXp(7999)).toBe(11);
    expect(getLevelForXp(8000)).toBe(12);
    expect(getLevelForXp(14000)).toBe(15);
  });
});

describe('getXpForLevel / getXpForNextLevel', () => {
  it('level 1 needs no XP', () => {
    expect(getXpForLevel(1)).toBe(0);
  });

  it('returns 100 to leave level 1', () => {
    expect(getXpForNextLevel(1)).toBe(100);
  });

  it('is the inverse of getLevelForXp', () => {
    for (let level = 1; level <= 20; level++) {
      expect(getLevelForXp(getXpForLevel(level))).toBe(level);
      expect(getLevelForXp(getXpForLevel(level) - 1)).toBe(Math.max(1, level - 1));
    }
  });
});

describe('getRankForLevel', () => {
  it('returns Novice for level 1', () => {
    const rank = getRankForLevel(1);
    expect(rank.name).toBe('Novice');
    expect(rank.color).toBe('#aaa');
  });

  it('returns Novice for level 2 (below Apprentice)', () => {
    expect(getRankForLevel(2).name).toBe('Novice');
  });

  it('returns Apprentice at level 3', () => {
    expect(getRankForLevel(3).name).toBe('Apprentice');
  });

  it('returns Warrior at level 5', () => {
    expect(getRankForLevel(5).name).toBe('Warrior');
  });

  it('returns Knight at level 7', () => {
    expect(getRankForLevel(7).name).toBe('Knight');
  });

  it('returns Champion at level 9', () => {
    expect(getRankForLevel(9).name).toBe('Champion');
  });

  it('returns Legend at level 11', () => {
    expect(getRankForLevel(11).name).toBe('Legend');
  });

  it('returns Legend for levels above 11', () => {
    expect(getRankForLevel(50).name).toBe('Legend');
  });

  it('returns correct rank for in-between levels', () => {
    expect(getRankForLevel(4).name).toBe('Apprentice');
    expect(getRankForLevel(6).name).toBe('Warrior');
    expect(getRankForLevel(8).name).toBe('Knight');
    expect(getRankForLevel(10).name).toBe('Champion');
  });
});

describe('calculateGoldEarned', () => {
  it('returns 0 gold for 0 XP', () => {
    expect(calculateGoldEarned(0)).toBe(0);
  });

  it('returns 1 gold for 10 XP', () => {
    expect(calculateGoldEarned(10)).toBe(1);
  });

  it('returns 5 gold for 50 XP', () => {
    expect(calculateGoldEarned(50)).toBe(5);
  });

  it('floors the result (no fractional gold)', () => {
    expect(calculateGoldEarned(15)).toBe(1); // 15 * 0.1 = 1.5 -> 1
    expect(calculateGoldEarned(3)).toBe(0);  // 3 * 0.1 = 0.3 -> 0
  });

  it('handles large XP values', () => {
    expect(calculateGoldEarned(1000)).toBe(100);
  });
});

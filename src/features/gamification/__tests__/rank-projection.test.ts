import { projectLevelDate, PACE_DAYS } from '../utils/rank-projection';
import { getXpForLevel } from '../../../lib/constants/game-config';

const NOW = new Date(2026, 9, 2, 12);

describe('projectLevelDate', () => {
  it('divides the XP still needed by the recent daily pace', () => {
    const needed = getXpForLevel(5) - 100;
    // A pace of exactly `needed / 10` XP a day: 10 days from now.
    const date = projectLevelDate(100, 5, (needed / 10) * PACE_DAYS, NOW);
    expect(date?.getDate()).toBe(12);
    expect(date?.getMonth()).toBe(9);
  });

  it('gives nothing without a pace, once reached, or more than a year away', () => {
    expect(projectLevelDate(100, 5, 0, NOW)).toBeNull();
    expect(projectLevelDate(getXpForLevel(5), 5, 500, NOW)).toBeNull();
    expect(projectLevelDate(0, 11, 1, NOW)).toBeNull();
  });
});

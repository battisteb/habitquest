import { leagueForTier, zoneForPlace, daysLeft } from '../utils/arena-display';

describe('arena display helpers', () => {
  it('maps tiers to leagues and clamps bad values', () => {
    expect(leagueForTier(1)).toBe('bronze');
    expect(leagueForTier(6)).toBe('master');
    expect(leagueForTier(0)).toBe('bronze');
    expect(leagueForTier(9)).toBe('master');
  });

  it('marks the top 3 and bottom 3', () => {
    expect(zoneForPlace(3, 2)).toBe('promotion');
    expect(zoneForPlace(4, 2)).toBe('safe');
    expect(zoneForPlace(8, 2)).toBe('safe');
    expect(zoneForPlace(9, 2)).toBe('relegation');
  });

  it('has no promotion above Master nor relegation below Bronze', () => {
    expect(zoneForPlace(1, 6)).toBe('safe');
    expect(zoneForPlace(11, 1)).toBe('safe');
  });

  it('counts the days left including today', () => {
    expect(daysLeft(0)).toBe(10);
    expect(daysLeft(9)).toBe(1);
  });
});

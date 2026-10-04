import { adventureDay, isRevealed } from '../utils/today-reveal';

describe('progressive Today (D5)', () => {
  it('counts the days of the adventure from the sign-up day', () => {
    const signup = new Date(2026, 9, 3, 22, 0).toISOString();
    expect(adventureDay(signup, new Date(2026, 9, 3, 23, 0))).toBe(1);
    expect(adventureDay(signup, new Date(2026, 9, 4, 0, 30))).toBe(2);
    expect(adventureDay(signup, new Date(2026, 9, 10, 12, 0))).toBe(8);
  });

  it('treats an unknown sign-up date as an old account', () => {
    expect(isRevealed('mood', adventureDay(null))).toBe(true);
  });

  it('reveals missions on day 2, the boss on day 3, mood on day 7', () => {
    expect(isRevealed('missions', 1)).toBe(false);
    expect(isRevealed('missions', 2)).toBe(true);
    expect(isRevealed('boss', 2)).toBe(false);
    expect(isRevealed('boss', 3)).toBe(true);
    expect(isRevealed('mood', 6)).toBe(false);
    expect(isRevealed('mood', 7)).toBe(true);
  });
});

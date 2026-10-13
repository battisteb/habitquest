import {
  isStreakActive,
  isCompletedToday,
  calculateNewStreak,
} from '../utils/streak-calculator';

function todayAt(hours: number, minutes = 0): string {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

describe('isStreakActive', () => {
  it('returns false for null', () => {
    expect(isStreakActive(null)).toBe(false);
  });

  it('returns true if completed today', () => {
    expect(isStreakActive(todayAt(9))).toBe(true);
  });

  it('returns true if completed yesterday', () => {
    expect(isStreakActive(daysAgo(1))).toBe(true);
  });

  it('returns false if completed 2 days ago', () => {
    expect(isStreakActive(daysAgo(2))).toBe(false);
  });

  describe('across a daylight-saving change (Paris)', () => {
    const tz = process.env.TZ;
    beforeAll(() => {
      process.env.TZ = 'Europe/Paris';
    });
    afterAll(() => {
      process.env.TZ = tz;
    });

    it('keeps the streak the day after the 25-hour day (clocks back on 25 Oct 2026)', () => {
      const completed = new Date(2026, 9, 25, 20, 0).toISOString();
      expect(isStreakActive(completed, new Date(2026, 9, 26, 8, 0))).toBe(true);
      expect(isStreakActive(completed, new Date(2026, 9, 27, 8, 0))).toBe(false);
    });

    it('keeps the streak the day after the 23-hour day (clocks forward on 28 Mar 2027)', () => {
      const completed = new Date(2027, 2, 28, 20, 0).toISOString();
      expect(isStreakActive(completed, new Date(2027, 2, 29, 8, 0))).toBe(true);
      expect(isStreakActive(completed, new Date(2027, 2, 30, 8, 0))).toBe(false);
    });
  });
});

describe('isCompletedToday', () => {
  it('returns false for null', () => {
    expect(isCompletedToday(null)).toBe(false);
  });

  it('returns true for today', () => {
    expect(isCompletedToday(todayAt(8))).toBe(true);
  });

  it('returns false for yesterday', () => {
    expect(isCompletedToday(daysAgo(1))).toBe(false);
  });
});

describe('calculateNewStreak', () => {
  it('starts a new streak when no prior completion', () => {
    const result = calculateNewStreak(0, 0, null);
    expect(result.currentCount).toBe(1);
    expect(result.longestCount).toBe(1);
  });

  it('continues streak from yesterday', () => {
    const result = calculateNewStreak(5, 10, daysAgo(1));
    expect(result.currentCount).toBe(6);
    expect(result.longestCount).toBe(10);
  });

  it('updates longest when current exceeds it', () => {
    const result = calculateNewStreak(10, 10, daysAgo(1));
    expect(result.currentCount).toBe(11);
    expect(result.longestCount).toBe(11);
  });

  it('resets streak after 2-day gap', () => {
    const result = calculateNewStreak(5, 10, daysAgo(2));
    expect(result.currentCount).toBe(1);
    expect(result.longestCount).toBe(10);
  });

  it('does not increment if already completed today', () => {
    const result = calculateNewStreak(5, 10, todayAt(9));
    expect(result.currentCount).toBe(5);
    expect(result.longestCount).toBe(10);
  });
});

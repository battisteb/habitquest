import { clampCoopTarget, suggestCoopTarget } from '../../../lib/constants/game-config';
import { coopProgressRatio, coopDaysLeft } from '../utils/coop-display';

// Bounds mirror public.create_coop_challenge (supabase/tests/coop.test.sql).
describe('co-op config', () => {
  it('suggests about one validation per player per day', () => {
    expect(suggestCoopTarget('validations', 3, 7)).toBe(21);
    expect(suggestCoopTarget('xp', 2, 7)).toBe(140);
  });

  it('keeps targets inside the server bounds', () => {
    expect(clampCoopTarget('validations', 1)).toBe(3);
    expect(clampCoopTarget('validations', 999)).toBe(200);
    expect(clampCoopTarget('xp', 10)).toBe(30);
    expect(suggestCoopTarget('validations', 1, 3)).toBe(3);
  });
});

describe('co-op display helpers', () => {
  it('caps progress at 100 %', () => {
    expect(coopProgressRatio({ progress: 5, target: 10 })).toBe(0.5);
    expect(coopProgressRatio({ progress: 15, target: 10 })).toBe(1);
  });

  it('rounds the days left up and never goes negative', () => {
    const now = new Date('2026-10-01T12:00:00Z');
    expect(coopDaysLeft('2026-10-01T15:00:00Z', now)).toBe(1);
    expect(coopDaysLeft('2026-10-04T12:00:00Z', now)).toBe(3);
    expect(coopDaysLeft('2026-09-30T12:00:00Z', now)).toBe(0);
    expect(coopDaysLeft(null, now)).toBeNull();
  });
});

import {
  ARENA,
  getArenaAttackPower,
  getArenaDefensePower,
  getArenaWinChance,
} from '../game-config';

// Same values as supabase/tests/arena.test.sql: the server is the reference.
describe('arena balance', () => {
  it('matches the server formulas', () => {
    expect(getArenaAttackPower(0, 1, 0)).toBe(102);
    expect(getArenaAttackPower(9, 1, 50)).toBe(100 + 150 + 2 + 90);
    expect(getArenaDefensePower(5, 1, 0)).toBe(177);
  });

  it('makes daily habits the main lever', () => {
    const lazy = getArenaAttackPower(0, 10, 10);
    const diligent = getArenaAttackPower(3, 10, 10);
    expect(diligent - lazy).toBe(3 * ARENA.ATTACK_PER_HABIT);
  });

  it('rewards regularity through the streak', () => {
    expect(getArenaAttackPower(2, 5, 20)).toBeGreaterThan(getArenaAttackPower(2, 5, 0));
  });

  it('turns powers into win odds', () => {
    expect(getArenaWinChance(300, 100)).toBe(1);
    expect(getArenaWinChance(100, 300)).toBe(0);
    const even = getArenaWinChance(200, 200);
    expect(even).toBeGreaterThan(0.4);
    expect(even).toBeLessThan(0.6);
  });

  it('has six leagues', () => {
    expect(ARENA.LEAGUES).toHaveLength(6);
  });
});

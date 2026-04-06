import { ATTACKS, getUnlockedAttacks } from '../utils/attacks';

describe('attacks', () => {
  it('always includes balanced_attack regardless of unlocked categories', () => {
    const attacks = getUnlockedAttacks([]);
    expect(attacks.some((a) => a.id === 'balanced_attack')).toBe(true);
  });

  it('includes category-specific attacks when category is unlocked', () => {
    const attacks = getUnlockedAttacks(['fitness']);
    const ids = attacks.map((a) => a.id);
    expect(ids).toContain('sprint');
    expect(ids).toContain('iron_will');
  });

  it('does not include locked category attacks', () => {
    const attacks = getUnlockedAttacks(['fitness']);
    const ids = attacks.map((a) => a.id);
    expect(ids).not.toContain('mind_blast');
    expect(ids).not.toContain('power_strike');
  });

  it('includes all attacks when all categories are unlocked', () => {
    const allCategories = [...new Set(ATTACKS.map((a) => a.category))];
    const attacks = getUnlockedAttacks(allCategories);
    expect(attacks.length).toBe(ATTACKS.length);
  });

  it('all attacks have valid hitChance between 0 and 1', () => {
    for (const attack of ATTACKS) {
      expect(attack.hitChance).toBeGreaterThan(0);
      expect(attack.hitChance).toBeLessThanOrEqual(1);
    }
  });

  it('all attacks have positive baseDamage', () => {
    for (const attack of ATTACKS) {
      expect(attack.baseDamage).toBeGreaterThan(0);
    }
  });
});

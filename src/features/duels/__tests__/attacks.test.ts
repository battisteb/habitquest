import { ATTACKS, ATTACK_CATEGORIES, getUnlockedAttacks, rankDamageBonus, nextLevelAttack, battleLoadout } from '../utils/attacks';
import { HABIT_CATEGORIES } from '../../../lib/constants/categories';

describe('attacks', () => {
  it('every habit category of the app gives an attack, and no attack needs a missing category', () => {
    const appCategories = HABIT_CATEGORIES.filter((k) => k !== 'general');
    expect([...ATTACK_CATEGORIES].sort()).toEqual([...appCategories].sort());
  });

  it('always includes the balanced attack', () => {
    expect(getUnlockedAttacks([]).map((a) => a.id)).toEqual(['balanced_attack']);
  });

  it('unlocks the attack of each category played 7 times', () => {
    const ids = getUnlockedAttacks(['health', 'finance']).map((a) => a.id);
    expect(ids).toContain('vital_strike');
    expect(ids).toContain('gold_rush');
    expect(ids).not.toContain('mind_blast');
  });

  it('unlocks one attack per rank with the hero level', () => {
    expect(getUnlockedAttacks([], 2).map((a) => a.id)).not.toContain('iron_will');
    expect(getUnlockedAttacks([], 3).map((a) => a.id)).toContain('iron_will');
    const legend = getUnlockedAttacks([], 11).map((a) => a.id);
    expect(legend).toEqual(expect.arrayContaining(['iron_will', 'power_strike', 'knight_charge', 'champion_blow', 'legend_strike']));
  });

  it('adds +1 damage per rank reached', () => {
    expect(rankDamageBonus(1)).toBe(0);
    expect(rankDamageBonus(5)).toBe(2);
    expect(rankDamageBonus(11)).toBe(5);
    const base = ATTACKS.find((a) => a.id === 'balanced_attack')!.baseDamage;
    expect(getUnlockedAttacks([], 7).find((a) => a.id === 'balanced_attack')!.baseDamage).toBe(base + 3);
  });

  it('tells the next attack to learn', () => {
    expect(nextLevelAttack(6)?.id).toBe('knight_charge');
    expect(nextLevelAttack(11)).toBeNull();
  });

  it('takes the opening attack plus the strongest ones into battle', () => {
    const all = getUnlockedAttacks(ATTACK_CATEGORIES, 11);
    const loadout = battleLoadout(all, 'rest_recover');
    expect(loadout).toHaveLength(4);
    expect(loadout[0].id).toBe('rest_recover');
  });

  it('all attacks have a valid hit chance and positive damage', () => {
    for (const a of ATTACKS) {
      expect(a.hitChance).toBeGreaterThan(0);
      expect(a.hitChance).toBeLessThanOrEqual(1);
      expect(a.baseDamage).toBeGreaterThan(0);
    }
  });
});

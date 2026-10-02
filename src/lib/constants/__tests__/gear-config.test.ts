import { GEAR, applyGearToDamage, duelGearEffects, gearStats, itemGearBonus } from '../game-config';

const none = { attack: 0, defense: 0, hp: 0 };
const best = { attack: 3, defense: 3, hp: 3 };

describe('equipment in combat (ADR 017)', () => {
  it('gives points by rarity to the stat of the slot', () => {
    expect(itemGearBonus('avatar_accessory', 'rare')).toEqual({ stat: 'attack', points: 3 });
    expect(itemGearBonus('avatar_hat', 'common')).toEqual({ stat: 'defense', points: 1 });
    expect(itemGearBonus('avatar_outfit', 'legendary')).toEqual({ stat: 'hp', points: 3 });
  });

  it('keeps backgrounds and themes cosmetic', () => {
    expect(itemGearBonus('avatar_background', 'epic')).toBeNull();
    expect(itemGearBonus('theme', 'rare')).toBeNull();
  });

  it('adds up an equipment', () => {
    expect(gearStats([
      { category: 'avatar_accessory', rarity: 'rare' },
      { category: 'avatar_hat', rarity: 'uncommon' },
      { category: 'avatar_outfit', rarity: 'legendary' },
      { category: 'avatar_background', rarity: 'epic' },
    ])).toEqual({ attack: 3, defense: 2, hp: 3 });
  });

  it('changes nothing without equipment', () => {
    expect(duelGearEffects(none)).toEqual({ damageMult: 1, damageTakenMult: 1, maxHp: 100 });
    expect(applyGearToDamage(15, none, none)).toBe(15);
  });

  it('stays light even with the best equipment', () => {
    const e = duelGearEffects(best);
    expect(e.damageMult).toBeCloseTo(1.09);
    expect(e.damageTakenMult).toBeCloseTo(0.91);
    expect(e.maxHp).toBe(112);
    // Below the level advantage, which is worth up to +40 % damage.
    expect(e.damageMult).toBeLessThan(1.4);
    expect(GEAR.ARENA.ATTACK_PER_POINT * 3).toBe(12);
    expect(GEAR.ARENA.DEFENSE_PER_POINT * 6).toBe(12);
  });

  it('gives Premium rarities no extra power (no pay-to-win)', () => {
    expect(itemGearBonus('avatar_hat', 'legendary')).toEqual(itemGearBonus('avatar_hat', 'rare'));
    expect(itemGearBonus('avatar_accessory', 'epic')).toEqual(itemGearBonus('avatar_accessory', 'rare'));
  });

  it('applies both fighters to a hit, never below 1, misses stay misses', () => {
    expect(applyGearToDamage(20, best, none)).toBe(22);
    expect(applyGearToDamage(20, none, best)).toBe(18);
    expect(applyGearToDamage(1, none, best)).toBe(1);
    expect(applyGearToDamage(0, best, none)).toBe(0);
  });
});

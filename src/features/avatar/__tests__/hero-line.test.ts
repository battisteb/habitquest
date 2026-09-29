import { heroLine, heroText } from '../utils/hero-line';
import { STRINGS_FOR_TESTS } from '../../../lib/i18n';
import { calculateXpEarned, getXpForLevel } from '../../../lib/constants/game-config';

describe('heroLine', () => {
  it('asks for a first quest when there is no habit', () => {
    expect(heroLine({ totalHabits: 0, pendingStreaks: [], xp: 0, level: 1 })).toEqual({ kind: 'no_habits' });
  });

  it('celebrates when everything is validated', () => {
    expect(heroLine({ totalHabits: 3, pendingStreaks: [], xp: 0, level: 1 })).toEqual({ kind: 'all_done' });
  });

  it('counts the fewest quests needed to level up, biggest rewards first', () => {
    const big = calculateXpEarned(21);
    const xp = getXpForLevel(3) - big - 1; // the biggest reward alone falls 1 XP short
    expect(heroLine({ totalHabits: 3, pendingStreaks: [0, 20, 0], xp, level: 2 })).toEqual({
      kind: 'level_up',
      count: 2,
      nextLevel: 3,
    });
  });

  it('says one quest when a single validation reaches the next level', () => {
    const xp = getXpForLevel(2) - 1;
    expect(heroLine({ totalHabits: 2, pendingStreaks: [0, 0], xp, level: 1 })).toEqual({
      kind: 'level_up',
      count: 1,
      nextLevel: 2,
    });
  });

  it('falls back to the number of pending quests when the level is out of reach', () => {
    expect(heroLine({ totalHabits: 2, pendingStreaks: [0, 0], xp: 0, level: 4 })).toEqual({ kind: 'pending', count: 2 });
  });
});

describe('heroText', () => {
  const T = STRINGS_FOR_TESTS.fr;

  it('fills the count and the level', () => {
    expect(heroText(T, { kind: 'level_up', count: 2, nextLevel: 6 })).toBe(
      'Encore 2 quêtes et on passe niveau 6 !',
    );
    expect(heroText(T, { kind: 'level_up', count: 1, nextLevel: 6 })).toBe(
      'Encore 1 quête et on passe niveau 6 !',
    );
    expect(heroText(T, { kind: 'pending', count: 3 })).toContain('3 quêtes');
  });
});

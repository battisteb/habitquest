import { BODY, GRID, HAT_SPRITES } from '../renderer/sprites';

/** Pixels of the hero's eyes (palette keys `e` and `w`). */
const EYES = BODY.flatMap((row, y) => [...row].flatMap((c, x) => (c === 'e' || c === 'w' ? [[x, y]] : [])));

describe('hat sprites', () => {
  it.each(Object.keys(HAT_SPRITES))('%s leaves the eyes visible', (hat) => {
    const rows = HAT_SPRITES[hat];
    expect(EYES.length).toBeGreaterThan(0);
    const covered = EYES.filter(([x, y]) => (rows[y]?.[x] ?? '.') !== '.');
    expect(covered).toEqual([]);
  });

  it.each(Object.keys(HAT_SPRITES))('%s is centered on the head', (hat) => {
    const cols = HAT_SPRITES[hat].flatMap((row) =>
      [...row].flatMap((c, x) => (c === '.' ? [] : [x])),
    );
    const left = Math.min(...cols);
    const right = Math.max(...cols);
    // The hero is symmetric around the middle of the grid.
    expect(left + right).toBe(GRID - 1);
  });
});

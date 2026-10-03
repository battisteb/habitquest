import type { Season } from '../../lib/constants/game-config';

/**
 * Seasonal runes (ADR 024): a 12×12 pixel gem, one glyph and one colour per
 * season. `.` is transparent, `k` the outline, `s` the stone, `g` the glyph.
 */
export const RUNE_GRID = 12;

const GEM = [
  '.....kk.....',
  '....kssk....',
  '...kssssk...',
  '..kssssssk..',
  '.kssssssssk.',
  'kssssssssssk',
  'kssssssssssk',
  '.kssssssssk.',
  '..kssssssk..',
  '...kssssk...',
  '....kssk....',
  '.....kk.....',
];

/** Glyph cells [x, y] drawn over the stone. */
const GLYPHS: Record<Season, [number, number][]> = {
  // Snowflake
  winter: [[5, 3], [6, 3], [5, 4], [6, 4], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6], [8, 6], [5, 7], [6, 7], [5, 8], [6, 8], [4, 4], [7, 4], [4, 7], [7, 7]],
  // Sprout
  spring: [[5, 5], [6, 5], [5, 6], [6, 6], [5, 7], [6, 7], [5, 8], [6, 8], [3, 4], [4, 4], [4, 5], [7, 3], [8, 3], [7, 4]],
  // Sun
  summer: [[5, 4], [6, 4], [4, 5], [5, 5], [6, 5], [7, 5], [4, 6], [5, 6], [6, 6], [7, 6], [5, 7], [6, 7], [5, 2], [6, 2], [2, 5], [2, 6], [9, 5], [9, 6], [5, 9], [6, 9]],
  // Leaf
  autumn: [[3, 8], [4, 7], [5, 6], [6, 5], [7, 4], [8, 3], [5, 4], [6, 4], [4, 5], [5, 5], [7, 5], [6, 6], [7, 6], [5, 7], [6, 3]],
};

export const RUNE_PALETTES: Record<Season, Record<string, string>> = {
  winter: { k: '#1b3a5c', s: '#5ec8ff', g: '#ffffff' },
  spring: { k: '#1d4d26', s: '#6ee07a', g: '#fff6c2' },
  summer: { k: '#6b4a00', s: '#ffcc33', g: '#ff7b1c' },
  autumn: { k: '#5a2410', s: '#e8743b', g: '#ffe0a0' },
};

/** Rows of a season's rune. */
export function runeRows(season: Season): string[] {
  const rows = GEM.map((r) => r.split(''));
  for (const [x, y] of GLYPHS[season]) {
    if (rows[y][x] === 's') rows[y][x] = 'g';
  }
  return rows.map((r) => r.join(''));
}

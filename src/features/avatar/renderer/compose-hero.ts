import {
  GRID,
  BODY,
  HAIR,
  TUNIC,
  HAT_SPRITES,
  HATS_OVER_HAIR,
  OUTFIT_SPRITES,
  ACCESSORY_SPRITES,
  HAT_COLORS,
  OUTFIT_COLORS,
  ACCESSORY_COLORS,
} from './sprites';

/**
 * Hero composition without React Native: the app renders it with views,
 * the marketing scripts (marketing/build-reels.js) draw it on a canvas.
 */

export const DEFAULTS = {
  skin: '#f4c98a',
  hair: '#4a3728',
  eye: '#1a1a2e',
  outfit: ['#e94560', '#b8354b', '#f0c43c'] as [string, string, string],
  pants: '#2a4a6a',
  shoes: '#3a2a1a',
};

/** Darkens (factor < 1) or lightens (factor > 1) a #rrggbb color. */
export function tint(hex: string, factor: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return factor < 1 ? Math.round(c * factor) : Math.min(255, Math.round(c + (255 - c) * (factor - 1)));
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, '0')).join('')}`;
}

type Palette = Record<string, string>;

const OUTLINE = '#1b1428';

function basePalette(skin: string, hair: string, eye: string): Palette {
  return {
    o: OUTLINE, s: skin, S: tint(skin, 0.82), c: '#eaa79a', w: '#f4f1ea', e: eye, m: '#a8584a',
    h: hair, H: tint(hair, 0.7), L: tint(hair, 1.35),
    n: DEFAULTS.pants, N: tint(DEFAULTS.pants, 0.72), f: DEFAULTS.shoes, F: tint(DEFAULTS.shoes, 0.7),
    b: '#5a3a1a', B: '#e0b04a',
  };
}

function outfitPalette([p, q, x]: [string, string, string]): Palette {
  return {
    o: OUTLINE, w: '#f4f1ea', b: '#5a3a1a', B: '#e0b04a',
    p, P: tint(p, 0.72), l: tint(p, 1.3), q, Q: tint(q, 0.72), x, X: tint(x, 0.72), y: tint(x, 1.35),
  };
}

// Season gems (1-4: winter, spring, summer, autumn), as on the arc runes.
const SEASON_GEMS: Palette = { 1: '#5ec8ff', 2: '#6ee07a', 3: '#ffcc33', 4: '#e8743b' };

function itemPalette([a, x]: [string, string]): Palette {
  return { o: OUTLINE, a, A: tint(a, 0.7), g: tint(a, 1.4), x, X: tint(x, 0.72), y: tint(x, 1.35), ...SEASON_GEMS };
}

export interface HeroLook {
  skin: string;
  hair: string;
  eye: string;
  hat?: string;
  outfit?: string;
  accessory?: string;
}

/**
 * Stacks the hero's layers into a GRID×GRID color map (null = transparent):
 * back accessory, body, outfit, hair or hat, front accessory.
 */
export function composeHero(look: HeroLook): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: GRID }, () => Array(GRID).fill(null));
  const paint = (rows: string[] | undefined, palette: Palette, fallback?: Palette) => {
    rows?.forEach((row, y) => {
      for (let x = 0; x < GRID; x++) {
        const ch = row[x];
        if (!ch || ch === '.') continue;
        grid[y][x] = palette[ch] ?? fallback?.[ch] ?? '#ff00ff';
      }
    });
  };

  const base = basePalette(look.skin, look.hair, look.eye);
  const acc = look.accessory ? ACCESSORY_SPRITES[look.accessory] : undefined;
  const accPalette = look.accessory ? itemPalette(ACCESSORY_COLORS[look.accessory] ?? ['#888888', '#bbbbbb']) : base;
  const hatRows = look.hat ? HAT_SPRITES[look.hat] : undefined;

  if (acc?.layer === 'back') paint(acc.rows, accPalette, base);
  paint(BODY, base);
  const outfitRows = (look.outfit && OUTFIT_SPRITES[look.outfit]) || TUNIC;
  paint(outfitRows, outfitPalette((look.outfit && OUTFIT_COLORS[look.outfit]) || DEFAULTS.outfit), base);
  if (!hatRows || HATS_OVER_HAIR.has(look.hat!)) paint(HAIR, base);
  if (hatRows) paint(hatRows, itemPalette(HAT_COLORS[look.hat!] ?? ['#aaaaaa', '#dddddd']), base);
  if (acc?.layer === 'front') paint(acc.rows, accPalette, base);
  return grid;
}

/** Merges same-colored neighbors of a row into one strip: far fewer views than one per pixel. */
export function toStrips(grid: (string | null)[][]): [number, number, number, string][] {
  const strips: [number, number, number, string][] = [];
  grid.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const color = row[x];
      if (!color) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < row.length && row[end] === color) end++;
      strips.push([x, y, end - x, color]);
      x = end;
    }
  });
  return strips;
}


import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
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

export interface PixelAvatarProps {
  size?: number;
  skinColor?: string;
  hairColor?: string;
  eyeColor?: string;
  hat?: string;
  outfit?: string;
  accessory?: string;
  background?: string;
  /** If provided, locks the bounce frame (use 0 for static previews). Otherwise auto-animates. */
  idleFrame?: number;
  /** Auto-bounce period in ms (default 700). Ignored when `idleFrame` is set. */
  idleIntervalMs?: number;
  /** Hero only, without its square and background: for scenes such as HeroStage. */
  bare?: boolean;
}

// ──────────────────────────────────────────
// Backgrounds (shop "décors")
// ──────────────────────────────────────────
export const BG_COLORS: Record<string, string[]> = {
  bg_forest:    ['#2d5a1e', '#1a3a10'],
  bg_castle:    ['#4a4a5a', '#3a3a4a'],
  bg_volcano:   ['#5a1a0a', '#3a0a00'],
  bg_starfield: ['#0a0a2e', '#050520'],
  bg_ocean:     ['#0077B6', '#023E8A'],
  bg_sunset:    ['#FF6B35', '#C62828'],
  bg_ice:       ['#B3E5FC', '#4FC3F7'],
  bg_neon:      ['#1a0033', '#4a0066'],
  default:      ['#1a1a2e', '#16213e'],
};

const DEFAULTS = {
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

function itemPalette([a, x]: [string, string]): Palette {
  return { o: OUTLINE, a, A: tint(a, 0.7), g: tint(a, 1.4), x, X: tint(x, 0.72), y: tint(x, 1.35) };
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

export function PixelAvatar({
  size = 200,
  skinColor = DEFAULTS.skin,
  hairColor = DEFAULTS.hair,
  eyeColor = DEFAULTS.eye,
  hat,
  outfit,
  accessory,
  background,
  idleFrame,
  idleIntervalMs = 700,
  bare = false,
}: PixelAvatarProps) {
  // Auto-animate when caller doesn't pin the frame. Static frame for previews.
  const [autoFrame, setAutoFrame] = useState(0);
  useEffect(() => {
    if (idleFrame !== undefined) return;
    const id = setInterval(() => setAutoFrame((f) => (f + 1) % 2), idleIntervalMs);
    return () => clearInterval(id);
  }, [idleFrame, idleIntervalMs]);
  const frame = idleFrame ?? autoFrame;

  const strips = useMemo(
    () => toStrips(composeHero({ skin: skinColor, hair: hairColor, eye: eyeColor, hat, outfit, accessory })),
    [skinColor, hairColor, eyeColor, hat, outfit, accessory],
  );

  const cell = size / GRID;
  // Idle bounce: the hero rises by one grid pixel every other frame.
  const bounceY = frame % 2 === 0 ? 0 : -cell;
  const bgColors = background && BG_COLORS[background] ? BG_COLORS[background] : BG_COLORS.default;

  return (
    <View style={[styles.container, bare && styles.bare, { width: size, height: size }]}>
      {!bare && (
        <>
          <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, backgroundColor: bgColors[0] }} />
          <View style={{ position: 'absolute', top: size * 0.6, left: 0, width: size, height: size * 0.4, backgroundColor: bgColors[1] }} />
        </>
      )}
      {strips.map(([x, y, w, color], i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: x * cell,
            top: y * cell + bounceY,
            // +0.5 hides hairline gaps between strips at fractional sizes.
            width: w * cell + 0.5,
            height: cell + 0.5,
            backgroundColor: color,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#2a2a4a',
  },
  bare: {
    borderWidth: 0,
    overflow: 'visible',
  },
});

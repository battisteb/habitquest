import { composeHero, frontAccessoryCells, type HeroLook } from './compose-hero';
import { ACCESSORY_SPRITES, GRID } from './sprites';

/**
 * Hero poses for game events (Battiste, 2026-10-13). The 32×32 hero is drawn once (compose-hero),
 * then a pose redraws its arms from the patches below, in the colors of the hero's own sleeves and
 * skin, and moves the held item with the hand — so every outfit and item works.
 */
export type HeroPose = 'idle' | 'breathe' | 'cheer' | 'ready' | 'victory' | 'rest';
export const HERO_POSES: HeroPose[] = ['idle', 'breathe', 'cheer', 'ready', 'victory', 'rest'];

type Grid = (string | null)[][];

const OUTLINE = '#1a1a2e';
const WHITE = '#f4f1ea';
// The hanging arms of the hero (both sides), cleared before a pose draws its own.
const ARM_ROWS = [21, 26];
const RIGHT_ARM_COLS = [21, 23];
const mirror = (x: number) => GRID - 1 - x;

/**
 * Arm patches for the hero's right side (viewer's right), from column 20 and row `top`:
 * o outline, A sleeve, D sleeve shadow, s skin, S skin shadow. The left arm is the mirror image.
 */
const ARMS: Record<'up' | 'high' | 'forward', { top: number; rows: string[]; fist: [number, number] }> = {
  // Thrown up and out (quest done).
  up: {
    top: 13,
    fist: [26, 15],
    rows: [
      '.....ooo.',
      '....osssO',
      '....ossSo',
      '....osSSo',
      '...oAooo.',
      '..oAAo...',
      '.oAAo....',
      '.AAo.....',
      'oDo......',
      'oo.......',
    ],
  },
  // Straight up beside the head (boss defeated).
  high: {
    top: 8,
    fist: [26, 10],
    rows: [
      '.....ooo.',
      '....osssO',
      '....ossSo',
      '....osSSo',
      '....oAAo.',
      '....oAAo.',
      '....oADo.',
      '....oADo.',
      '...oAAo..',
      '..oAAo...',
      '.oAAo....',
      '.oAo.....',
      '.AAo.....',
      'oDo......',
      'oo.......',
    ],
  },
  // Held out in front, guard up (fighting the boss).
  forward: {
    top: 19,
    fist: [26, 21],
    rows: [
      '.oooo....',
      '.AAAAoooo',
      'oDDDosssO',
      'oooooSSSo',
      '.....oooo',
    ],
  },
};

function drawArm(grid: Grid, kind: keyof typeof ARMS, side: 'right' | 'left', colors: Record<string, string>) {
  const { top, rows } = ARMS[kind];
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    if (ch === '.') return;
    const x = side === 'right' ? 20 + dx : mirror(20 + dx);
    const y = top + dy;
    if (x >= 0 && x < GRID && y >= 0 && y < GRID) grid[y][x] = ch === 'O' ? OUTLINE : colors[ch];
  }));
}

function clearArm(grid: Grid, side: 'right' | 'left') {
  for (let y = ARM_ROWS[0]; y <= ARM_ROWS[1]; y++) {
    for (let x = RIGHT_ARM_COLS[0]; x <= RIGHT_ARM_COLS[1]; x++) grid[y][side === 'right' ? x : mirror(x)] = null;
  }
}

const shift = (grid: Grid, dy: number): Grid =>
  grid.map((_, y) => (grid[y - dy] ? [...grid[y - dy]] : Array(GRID).fill(null)));

/** The hero in a pose, as a GRID×GRID color map (null = transparent). */
export function poseHero(look: HeroLook, pose: HeroPose): Grid {
  const front = !!look.accessory && ACCESSORY_SPRITES[look.accessory]?.layer === 'front';
  const base = composeHero(front ? { ...look, accessory: undefined } : look);
  // The held item, and the hand that holds it.
  let item = frontAccessoryCells(look);
  const rightHand = item.length > 0 && item.reduce((a, [x]) => a + x, 0) / item.length > GRID / 2;
  // The hero's own colors: sleeve, sleeve shadow, skin, skin shadow.
  const colors = { o: OUTLINE, A: base[22][22] ?? OUTLINE, D: base[22][21] ?? OUTLINE, s: base[23][21] ?? OUTLINE, S: base[24][22] ?? OUTLINE };

  let grid = base.map((row) => [...row]);
  // Moves the item with the hand that holds it, from the hanging hand (22, 24) to `fist`.
  const carry = (side: 'right' | 'left', fist: [number, number]) => {
    if (rightHand !== (side === 'right')) return;
    const [hx, hy] = side === 'right' ? [22, 24] : [mirror(22), 24];
    const fx = side === 'right' ? fist[0] : mirror(fist[0]);
    item = item.map(([x, y, c]) => [x + fx - hx, y + fist[1] - hy, c]);
  };
  const pose2 = (kind: keyof typeof ARMS, side: 'right' | 'left') => {
    clearArm(grid, side);
    drawArm(grid, kind, side, colors);
    carry(side, ARMS[kind].fist);
  };

  let lift = 0;
  switch (pose) {
    case 'breathe':
      // Second idle frame: head and chest sink a pixel, the legs stay.
      grid = grid.map((row, y) => (y <= 25 ? (y === 0 ? Array(GRID).fill(null) : [...base[y - 1]]) : row));
      item = item.map(([x, y, c]) => [x, y + 1, c]);
      break;
    case 'cheer':
      pose2('up', 'right');
      pose2('up', 'left');
      lift = -1;
      break;
    case 'ready':
      pose2('forward', rightHand || !item.length ? 'right' : 'left');
      break;
    case 'victory':
      pose2('high', rightHand || !item.length ? 'right' : 'left');
      pose2('up', rightHand || !item.length ? 'left' : 'right');
      lift = -1;
      break;
    case 'rest': {
      // Rest day or broken streak: eyes closed, sitting on folded legs.
      for (let y = 11; y <= 13; y++) {
        for (let x = 9; x <= 22; x++) if (grid[y][x] === look.eye || grid[y][x] === WHITE) grid[y][x] = base[14][x === 11 ? 12 : x] ?? grid[y][x];
      }
      for (const x of [10, 11, 12, 19, 20, 21]) grid[13][x] = look.eye;
      grid = [...shift(grid, 3).slice(0, 29), ...grid.slice(29)];
      item = item.map(([x, y, c]) => [x, y + 3, c]);
      break;
    }
    default:
      break;
  }
  for (const [x, y, c] of item) if (x >= 0 && x < GRID && y >= 0 && y < GRID) grid[y][x] = c;
  return lift ? shift(grid, lift) : grid;
}

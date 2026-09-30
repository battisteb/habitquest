import type { ThemeKey } from '../../../ui/theme/themes';

/** One block of the scene, in grid cells: [x, y, width, height, color]. */
export type SceneRect = [number, number, number, number, string];

/** Rows of the scene grid; the horizon sits at HORIZON, the ground below. */
export const SCENE_ROWS = 36;
const HORIZON = 24;

/** Deterministic 0..n-1 from a column (building heights, windows): no flicker between renders. */
function hash(x: number, n: number): number {
  return Math.abs(Math.imul(x + 11, 2654435761) >> 7) % n;
}

function base(cols: number, sky: string, horizon: string, ground: string, edge: string): SceneRect[] {
  return [
    [0, 0, cols, HORIZON, sky],
    [0, HORIZON - 3, cols, 3, horizon],
    [0, HORIZON, cols, SCENE_ROWS - HORIZON, ground],
    [0, HORIZON, cols, 1, edge],
  ];
}

function torch(x: number): SceneRect[] {
  return [
    [x, 12, 1, 4, '#5a3a1a'],
    [x - 1, 9, 3, 3, '#ff8c1a'],
    [x, 8, 1, 2, '#ffd23f'],
  ];
}

function dungeon(cols: number): SceneRect[] {
  const rects = base(cols, '#1d1b30', '#24213a', '#14121f', '#2c2945');
  // Stone wall: mortar every 4 rows, joints staggered every 8 columns.
  for (let y = 3; y < HORIZON; y += 4) {
    rects.push([0, y, cols, 1, '#15142a']);
    for (let x = (y / 4) % 2 === 0 ? 0 : 4; x < cols; x += 8) rects.push([x, y - 3, 1, 3, '#15142a']);
  }
  // Floor tiles.
  for (let x = 0; x < cols; x += 6) rects.push([x, HORIZON + 1, 1, SCENE_ROWS - HORIZON - 1, '#1b1929']);
  rects.push(...torch(Math.round(cols * 0.15)), ...torch(Math.round(cols * 0.85)));
  return rects;
}

function castle(cols: number): SceneRect[] {
  const rects = base(cols, '#3b2414', '#5a3520', '#2c1a10', '#6b4a2a');
  // Crenellated wall on the horizon, banners on each side.
  rects.push([0, HORIZON - 7, cols, 7, '#24160c']);
  for (let x = 0; x < cols; x += 4) rects.push([x, HORIZON - 9, 2, 2, '#24160c']);
  for (const x of [Math.round(cols * 0.2), Math.round(cols * 0.8)]) {
    rects.push([x, HORIZON - 16, 1, 9, '#3a2a1a'], [x + 1, HORIZON - 16, 3, 5, '#a8322a'], [x + 1, HORIZON - 12, 3, 1, '#d4af37']);
  }
  return rects;
}

function city(cols: number): SceneRect[] {
  const rects = base(cols, '#0a0620', '#140a30', '#050510', '#00ffff');
  // Skyline: buildings of varying height, lit windows in magenta and cyan.
  for (let x = 0; x < cols; x += 5) {
    const h = 6 + hash(x, 12);
    rects.push([x, HORIZON - h, 4, h, '#120a2a']);
    for (let wy = HORIZON - h + 1; wy < HORIZON - 1; wy += 2) {
      if (hash(x * 31 + wy, 3) === 0) rects.push([x + 1 + hash(wy, 2), wy, 1, 1, hash(x + wy, 2) ? '#ff00ff' : '#00ffff']);
    }
  }
  rects.push([0, HORIZON + 5, cols, 1, '#2a0a3a']);
  return rects;
}

function forest(cols: number): SceneRect[] {
  const rects = base(cols, '#1f3d26', '#2a5233', '#0f2a0f', '#4caf50');
  // Hills, then trees (trunk + canopy) spread across the width.
  for (let x = 0; x < cols; x += 9) rects.push([x, HORIZON - 4 - hash(x, 3), 9, 4 + hash(x, 3), '#18331c']);
  for (let x = 2; x < cols; x += 7) {
    const top = HORIZON - 9 - hash(x, 4);
    rects.push([x + 1, top + 4, 1, HORIZON - top - 4, '#4a2e14'], [x - 1, top, 5, 4, '#2e7d32'], [x, top - 1, 3, 1, '#43a047']);
  }
  return rects;
}

function daylight(cols: number): SceneRect[] {
  const rects = base(cols, '#e8f1f7', '#dce9f2', '#d9d2c5', '#c8bfae');
  const sun = Math.round(cols * 0.8);
  rects.push([sun, 4, 4, 4, '#f2c14e'], [sun + 1, 3, 2, 6, '#f2c14e']);
  for (const [x, y] of [[Math.round(cols * 0.12), 6], [Math.round(cols * 0.45), 3], [Math.round(cols * 0.6), 9]]) {
    rects.push([x, y, 6, 2, '#ffffff'], [x + 1, y - 1, 3, 1, '#ffffff']);
  }
  return rects;
}

const SCENES: Record<ThemeKey, (cols: number) => SceneRect[]> = {
  default: dungeon,
  medieval: castle,
  cyberpunk: city,
  nature: forest,
  lifestyle: daylight,
};

/**
 * The scene behind the hero on the Me screen. It follows the theme; an
 * equipped background from the shop ([sky, ground] colors) replaces it.
 */
export function heroScene(theme: ThemeKey, cols: number, background?: string[]): SceneRect[] {
  if (background) return base(cols, background[0], background[0], background[1], background[1]);
  return (SCENES[theme] ?? SCENES.default)(cols);
}

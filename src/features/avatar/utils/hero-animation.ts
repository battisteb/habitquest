import type { HeroPose } from '../renderer/poses';
import type { HeroReaction } from '../stores/hero-reaction-store';

/** One image of an animation: a pose, how long it stays, and a nudge in grid pixels. */
export interface HeroFrame {
  pose: HeroPose;
  ms: number;
  dx?: number;
  dy?: number;
}

/** At rest: the hero breathes (head and chest sink a pixel, the legs stay). */
export const IDLE_LOOP: HeroFrame[] = [
  { pose: 'idle', ms: 700 },
  { pose: 'breathe', ms: 700 },
];

const repeat = (frames: HeroFrame[], times: number) => Array.from({ length: times }, () => frames).flat();

/** The sequence of each reaction (validated in the test video of 2026-10-13), then back to IDLE_LOOP. */
export const REACTIONS: Record<HeroReaction, HeroFrame[]> = {
  // Quest done: two little hops, arms up.
  cheer: repeat([{ pose: 'cheer', ms: 180, dy: -1 }, { pose: 'cheer', ms: 300 }, { pose: 'idle', ms: 200 }], 2),
  // A quest hits the weekly boss: guard up, a lunge forward.
  strike: [
    { pose: 'ready', ms: 150 },
    { pose: 'ready', ms: 120, dx: 1 },
    { pose: 'ready', ms: 250 },
    { pose: 'idle', ms: 200 },
  ],
  // Boss defeated: weapon raised, four hops.
  victory: repeat([{ pose: 'victory', ms: 250 }, { pose: 'victory', ms: 200, dy: -1 }], 4),
};

export const sequenceMs = (frames: HeroFrame[]) => frames.reduce((a, f) => a + f.ms, 0);

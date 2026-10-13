import { act, render } from '@testing-library/react-native';
import { DEFAULTS, frontAccessoryCells } from '../renderer/compose-hero';
import { HERO_POSES, poseHero } from '../renderer/poses';
import { ACCESSORY_SPRITES, GRID } from '../renderer/sprites';
import { PixelAvatar } from '../renderer/pixel-avatar';
import { heroQuestDone, heroReaction$, playHeroReaction } from '../stores/hero-reaction-store';
import { REACTIONS, sequenceMs } from '../utils/hero-animation';

const LOOK = { skin: DEFAULTS.skin, hair: DEFAULTS.hair, eye: DEFAULTS.eye };
const HELD = Object.keys(ACCESSORY_SPRITES).filter((k) => ACCESSORY_SPRITES[k].layer === 'front');

/** Number of separate pieces in a pose (8-neighbours): 1 when nothing floats beside the hero. */
function pieces(grid: (string | null)[][]): number {
  const seen = new Set<string>();
  let n = 0;
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c || seen.has(`${x},${y}`)) return;
    n++;
    const stack = [[x, y]];
    seen.add(`${x},${y}`);
    while (stack.length) {
      const [cx, cy] = stack.pop()!;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (grid[ny]?.[nx] && !seen.has(`${nx},${ny}`)) {
          seen.add(`${nx},${ny}`);
          stack.push([nx, ny]);
        }
      }
    }
  }));
  return n;
}

describe('hero poses', () => {
  it.each(HERO_POSES)('%s: a full grid, in one piece, with and without each held item', (pose) => {
    for (const accessory of [undefined, ...HELD]) {
      const grid = poseHero({ ...LOOK, accessory }, pose);
      expect(grid).toHaveLength(GRID);
      grid.forEach((row) => expect(row).toHaveLength(GRID));
      expect([pose, accessory, pieces(grid)]).toEqual([pose, accessory, 1]);
    }
  });

  it('keeps every pixel of the sword when the arm moves', () => {
    const sword = frontAccessoryCells({ ...LOOK, accessory: 'acc_sword' });
    for (const pose of HERO_POSES) {
      const grid = poseHero({ ...LOOK, accessory: 'acc_sword' }, pose);
      const swordColors = new Set(sword.map(([, , c]) => c));
      const drawn = grid.flat().filter((c) => c && swordColors.has(c)).length;
      expect([pose, drawn >= sword.filter(([, , c]) => c !== DEFAULTS.skin).length]).toEqual([pose, true]);
    }
  });

  it('raises the sword above the head for the victory', () => {
    const top = (pose: 'idle' | 'victory') =>
      poseHero({ ...LOOK, accessory: 'acc_sword' }, pose).findIndex((row, y) => row.some((c, x) => c && x > 23 && y >= 0));
    expect(top('victory')).toBeLessThan(top('idle'));
    expect(top('victory')).toBeLessThan(8);
  });

  it('closes the eyes on a rest day', () => {
    const white = '#f4f1ea';
    expect(poseHero(LOOK, 'idle').flat()).toContain(white);
    expect(poseHero(LOOK, 'rest').flat()).not.toContain(white);
  });
});

describe('hero reactions', () => {
  beforeEach(() => heroReaction$.assign({ reaction: null, id: 0, at: 0, bossActive: false }));

  it('strikes the boss when one is on screen, else cheers', () => {
    heroQuestDone();
    expect(heroReaction$.reaction.get()).toBe('cheer');
    heroReaction$.bossActive.set(true);
    heroQuestDone();
    expect(heroReaction$.reaction.get()).toBe('strike');
  });

  it('does not cut a victory with a weaker reaction', () => {
    playHeroReaction('victory', 1000);
    playHeroReaction('cheer', 1500);
    expect(heroReaction$.reaction.get()).toBe('victory');
    playHeroReaction('cheer', 4000);
    expect(heroReaction$.reaction.get()).toBe('cheer');
  });

  it('plays the sequence on a reactive hero, then breathes again', () => {
    jest.useFakeTimers();
    const ui = render(<PixelAvatar size={64} reactive />);
    act(() => playHeroReaction('victory'));
    act(() => jest.advanceTimersByTime(10));
    expect(ui.getByTestId('hero-pose-victory')).toBeTruthy();
    act(() => jest.advanceTimersByTime(sequenceMs(REACTIONS.victory)));
    expect(ui.queryByTestId('hero-pose-victory')).toBeNull();
    jest.useRealTimers();
  });

  it('stays still in its pose (rest day) and ignores events when not reactive', () => {
    jest.useFakeTimers();
    const ui = render(<PixelAvatar size={64} pose="rest" />);
    act(() => playHeroReaction('cheer'));
    act(() => jest.advanceTimersByTime(2000));
    expect(ui.getByTestId('hero-pose-rest')).toBeTruthy();
    jest.useRealTimers();
  });
});

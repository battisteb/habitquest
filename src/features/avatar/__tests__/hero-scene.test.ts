import { heroScene, SCENE_ROWS } from '../utils/hero-scene';
import type { ThemeKey } from '../../../ui/theme/themes';

const THEMES: ThemeKey[] = ['default', 'medieval', 'cyberpunk', 'nature', 'lifestyle'];

describe('hero scene', () => {
  it.each(THEMES)('draws a %s scene that fills the width and stays in the frame', (theme) => {
    const rects = heroScene(theme, 80);
    expect(rects[0]).toEqual([0, 0, 80, expect.any(Number), expect.any(String)]);
    for (const [x, y, w, h] of rects) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y + h).toBeLessThanOrEqual(SCENE_ROWS);
      expect(x + w).toBeLessThanOrEqual(80 + 5);
    }
  });

  it('gives each theme its own look', () => {
    const skies = new Set(THEMES.map((t) => heroScene(t, 80)[0][4]));
    expect(skies.size).toBe(THEMES.length);
  });

  it('is stable between renders (no random flicker)', () => {
    expect(heroScene('cyberpunk', 60)).toEqual(heroScene('cyberpunk', 60));
  });

  it('uses the background bought in the shop when one is equipped', () => {
    const rects = heroScene('cyberpunk', 60, ['#2d5a1e', '#1a3a10']);
    expect(rects[0][4]).toBe('#2d5a1e');
    expect(rects.some(([, , , , c]) => c === '#1a3a10')).toBe(true);
    expect(rects).toHaveLength(4);
  });

  it('adapts to wider screens', () => {
    expect(heroScene('nature', 120).length).toBeGreaterThan(heroScene('nature', 60).length);
  });
});

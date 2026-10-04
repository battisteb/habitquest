/**
 * Pip's Sky is the free theme; the former dark default and Pastel Dawn are sold in the
 * shop (ADR 030). Light themes lighten what dark themes darken.
 */
import { THEMES, THEME_META } from '../themes';
import { applyThemeToColors, colors, isLightTheme } from '../tokens';
import { mix } from '../../components/pixel-frame';
import { FREE_THEME, ownedThemes } from '../../../features/shop/utils/owned-themes';
import { heroScene } from '../../../features/avatar/utils/hero-scene';
import { STRINGS_FOR_TESTS } from '../../../lib/i18n';

jest.mock('../../../lib/storage/mmkv', () => ({ storage: { getString: () => undefined, set: jest.fn() } }));

describe("Pip's Sky", () => {
  afterEach(() => applyThemeToColors('default'));

  it('is the free theme, light, in Pip’s blue', () => {
    expect(FREE_THEME).toBe('default');
    applyThemeToColors('default');
    expect(isLightTheme()).toBe(true);
    expect(colors.background).toBe('#CFE8FF');
    expect(colors.surface).toBe('#FFFFFF');
  });

  it('keeps the old dark palette as the Dark Dungeon theme', () => {
    expect(THEMES.dungeon.background).toBe('#0D0D1A');
    applyThemeToColors('dungeon');
    expect(isLightTheme()).toBe(false);
    applyThemeToColors('dawn');
    expect(isLightTheme()).toBe(true);
  });

  it('sells the dark and the pastel themes', () => {
    const items = [
      { id: 'd', category: 'theme', sprite_key: 'theme_dungeon' },
      { id: 'p', category: 'theme', sprite_key: 'theme_dawn' },
    ];
    expect([...ownedThemes(items, [])]).toEqual(['default']);
    expect(ownedThemes(items, ['d', 'p'])).toEqual(new Set(['default', 'dungeon', 'dawn']));
  });

  it('has a name, a description and a hero scene for every theme', () => {
    for (const key of Object.keys(THEMES) as (keyof typeof THEMES)[]) {
      expect(THEME_META[key]).toBeDefined();
      expect(heroScene(key, 40).length).toBeGreaterThan(4);
    }
    for (const lang of ['fr', 'en', 'ja', 'ko'] as const) {
      for (const key of ['default', 'dungeon', 'dawn']) {
        expect(STRINGS_FOR_TESTS[lang][`theme_name_${key}` as keyof (typeof STRINGS_FOR_TESTS)['fr']]).toBeTruthy();
      }
    }
    expect(STRINGS_FOR_TESTS.fr.theme_name_default).toBe('Ciel de Pip');
  });

  it('mixes two colors', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(mix('#2FA35E', '#ffffff', 0)).toBe('#2fa35e');
    expect(mix('bad', '#ffffff', 0.5)).toBe('bad');
  });
});

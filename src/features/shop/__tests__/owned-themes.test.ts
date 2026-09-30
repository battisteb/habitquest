import { ownedThemes, themeKeyOfItem, FREE_THEME } from '../utils/owned-themes';

const items = [
  { id: 'm', category: 'theme', sprite_key: 'theme_medieval' },
  { id: 'c', category: 'theme', sprite_key: 'theme_cyberpunk' },
  { id: 'o', category: 'theme', sprite_key: 'theme_ocean' },
  { id: 'h', category: 'avatar_hat', sprite_key: 'hat_wizard' },
];

describe('owned themes (Q15)', () => {
  it('maps shop themes to the app themes, and nothing else', () => {
    expect(themeKeyOfItem('theme_medieval')).toBe('medieval');
    expect(themeKeyOfItem('theme_nature')).toBe('nature');
    expect(themeKeyOfItem('theme_ocean')).toBeNull();
  });

  it('always includes the free dungeon theme', () => {
    expect([...ownedThemes(items, [])]).toEqual([FREE_THEME]);
  });

  it('adds the themes bought in the shop', () => {
    const owned = ownedThemes(items, ['m', 'h', 'o']);
    expect(owned.has('medieval')).toBe(true);
    expect(owned.has('cyberpunk')).toBe(false);
    expect(owned.size).toBe(2);
  });
});

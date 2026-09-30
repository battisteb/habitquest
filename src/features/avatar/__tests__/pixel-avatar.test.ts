import { composeHero, toStrips, tint } from '../renderer/pixel-avatar';
import { GRID, HAT_SPRITES, OUTFIT_SPRITES, ACCESSORY_SPRITES, HAT_COLORS, OUTFIT_COLORS, ACCESSORY_COLORS } from '../renderer/sprites';

// sprite_key of every avatar item sold in the shop (shop_items.sprite_key).
const SHOP_KEYS = {
  hat: ['hat_adventurer', 'hat_knight', 'hat_pirate', 'hat_wizard', 'hat_viking', 'hat_samurai', 'hat_crown', 'hat_halo', 'hat_dragon'],
  outfit: ['outfit_peasant', 'outfit_leather', 'outfit_forest', 'outfit_mage', 'outfit_ice', 'outfit_crimson', 'outfit_golden', 'outfit_royal', 'outfit_shadow'],
  accessory: ['acc_shield_wood', 'acc_scarf', 'acc_shield', 'acc_sword', 'acc_amulet', 'acc_cape', 'acc_flame_sword', 'acc_wings', 'acc_aura'],
};
const LOOK = { skin: '#f4c98a', hair: '#4a3728', eye: '#1a1a2e' };
const UNKNOWN = '#ff00ff';

describe('32x32 hero sprites', () => {
  it('draws every item sold in the shop, with its colors', () => {
    for (const k of SHOP_KEYS.hat) expect([k, !!HAT_SPRITES[k] && !!HAT_COLORS[k]]).toEqual([k, true]);
    for (const k of SHOP_KEYS.outfit) expect([k, !!OUTFIT_SPRITES[k] && !!OUTFIT_COLORS[k]]).toEqual([k, true]);
    for (const k of SHOP_KEYS.accessory) expect([k, !!ACCESSORY_SPRITES[k] && !!ACCESSORY_COLORS[k]]).toEqual([k, true]);
  });

  it('keeps every sprite on the grid', () => {
    const all = [...Object.values(HAT_SPRITES), ...Object.values(OUTFIT_SPRITES), ...Object.values(ACCESSORY_SPRITES).map((a) => a.rows)];
    for (const rows of all) {
      expect(rows).toHaveLength(GRID);
      for (const r of rows) expect(r).toHaveLength(GRID);
    }
  });

  it.each([
    ...SHOP_KEYS.hat.map((hat) => ({ hat })),
    ...SHOP_KEYS.outfit.map((outfit) => ({ outfit })),
    ...SHOP_KEYS.accessory.map((accessory) => ({ accessory })),
  ])('resolves every pixel of %o to a real color', (items) => {
    const grid = composeHero({ ...LOOK, ...items });
    expect(grid.flat()).not.toContain(UNKNOWN);
  });

  it('changes the picture when an item is equipped', () => {
    const bare = JSON.stringify(composeHero(LOOK));
    for (const k of SHOP_KEYS.accessory) expect(JSON.stringify(composeHero({ ...LOOK, accessory: k }))).not.toBe(bare);
  });

  it('hides the hair under a hat, but not under the halo', () => {
    const hairColor = '#123456';
    const withHat = composeHero({ ...LOOK, hair: hairColor, hat: 'hat_knight' }).flat();
    const withHalo = composeHero({ ...LOOK, hair: hairColor, hat: 'hat_halo' }).flat();
    expect(withHat).not.toContain(hairColor);
    expect(withHalo).toContain(hairColor);
  });

  it('draws a fully dressed hero with a few hundred strips at most', () => {
    const grid = composeHero({ ...LOOK, hat: 'hat_wizard', outfit: 'outfit_royal', accessory: 'acc_wings' });
    const strips = toStrips(grid);
    expect(strips.length).toBeLessThan(400);
    // Strips cover exactly the painted pixels.
    const painted = grid.flat().filter(Boolean).length;
    expect(strips.reduce((n, [, , w]) => n + w, 0)).toBe(painted);
  });

  it('derives shades and highlights', () => {
    expect(tint('#808080', 0.5)).toBe('#404040');
    expect(tint('#000000', 2)).toBe('#ffffff');
  });
});

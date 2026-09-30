import { THEMES, type ThemeKey } from '../../../ui/theme/themes';

/** The dark dungeon theme is free; the others are sold in the shop (Q15). */
export const FREE_THEME: ThemeKey = 'default';

/** Shop item sprite_key → app theme ('theme_medieval' → 'medieval'); null for unknown keys. */
export function themeKeyOfItem(spriteKey: string): ThemeKey | null {
  const key = spriteKey.replace(/^theme_/, '');
  return key in THEMES ? (key as ThemeKey) : null;
}

export function ownedThemes(
  items: { id: string; category: string; sprite_key: string }[],
  ownedIds: string[],
): Set<ThemeKey> {
  const owned = new Set<ThemeKey>([FREE_THEME]);
  for (const item of items) {
    if (item.category !== 'theme' || !ownedIds.includes(item.id)) continue;
    const key = themeKeyOfItem(item.sprite_key);
    if (key) owned.add(key);
  }
  return owned;
}

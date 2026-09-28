import type { Strings } from './index';

/** Translated name of a habit category key (health, fitness…). */
export function categoryLabel(T: Strings, category: string): string {
  const key = `cat_${category}` as keyof Strings;
  return T[key] ?? category;
}

/** Translated shop item rarity (common, rare…). */
export function rarityLabel(T: Strings, rarity: string): string {
  const key = `rarity_${rarity}` as keyof Strings;
  return T[key] ?? rarity;
}

/** Translated rank / avatar stage title. Ranks are stored in English in the database. */
export function titleLabel(T: Strings, title: string): string {
  const key = `title_${title.toLowerCase()}` as keyof Strings;
  return T[key] ?? title;
}

/** Translated avatar stage description, keyed by the stage's English title. */
export function stageDescription(T: Strings, title: string, fallback: string): string {
  const key = `stage_desc_${title.toLowerCase()}` as keyof Strings;
  return T[key] ?? fallback;
}

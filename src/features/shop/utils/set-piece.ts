import type { Strings } from '../../../lib/i18n';
import { categoryLabel } from '../../../lib/i18n/labels';

/** A piece of a category set (ADR 032): earned with a streak, never sold. */
export interface SetPiece {
  unlock_category?: string | null;
  unlock_streak?: number | null;
}

export const isSetPiece = (item: SetPiece): boolean => !!item.unlock_category && !!item.unlock_streak;

/** "21 days in a row on a Learning quest", or the longer explanation shown on tap. */
export function setPieceText(T: Strings, item: SetPiece, long = false): string {
  return (long ? T.shop_set_msg : T.shop_set_unlock)
    .replace('{days}', String(item.unlock_streak ?? ''))
    .replace('{category}', categoryLabel(T, item.unlock_category ?? 'general'));
}

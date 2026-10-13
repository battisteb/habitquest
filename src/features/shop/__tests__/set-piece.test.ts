import { STRINGS_FOR_TESTS } from '../../../lib/i18n';
import { isSetPiece, setPieceText } from '../utils/set-piece';
import { HAT_SPRITES, OUTFIT_SPRITES, ACCESSORY_SPRITES, HAT_COLORS, OUTFIT_COLORS, ACCESSORY_COLORS } from '../../avatar/renderer/sprites';

const { fr: FR, en: EN } = STRINGS_FOR_TESTS;

const DUMBBELL = { unlock_category: 'fitness', unlock_streak: 21 };

describe('category set pieces (ADR 032)', () => {
  it('tells a set piece from a shop item', () => {
    expect(isSetPiece(DUMBBELL)).toBe(true);
    expect(isSetPiece({ unlock_category: null, unlock_streak: null })).toBe(false);
  });

  it('says how to earn it, in the player language', () => {
    expect(setPieceText(FR, DUMBBELL)).toBe('21 jours d’affilée sur une quête Sport');
    expect(setPieceText(EN, DUMBBELL)).toBe('21 days in a row on a Fitness quest');
    expect(setPieceText(EN, DUMBBELL, true)).toContain('not for sale');
  });

  it('draws every piece of the four sets, with its colors', () => {
    for (const k of ['hat_sport_headband', 'hat_scholar_cap', 'hat_lotus', 'hat_laurel']) expect([k, !!HAT_SPRITES[k] && !!HAT_COLORS[k]]).toEqual([k, true]);
    for (const k of ['outfit_sport', 'outfit_scholar', 'outfit_monk', 'outfit_healer']) expect([k, !!OUTFIT_SPRITES[k] && !!OUTFIT_COLORS[k]]).toEqual([k, true]);
    for (const k of ['acc_dumbbell', 'acc_book', 'acc_prayer_beads', 'acc_water_bottle']) expect([k, ACCESSORY_SPRITES[k]?.layer === 'front' && !!ACCESSORY_COLORS[k]]).toEqual([k, true]);
  });
});

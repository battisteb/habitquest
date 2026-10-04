/**
 * Seasonal cosmetics (G6b): each arc sells its cape for gold, during the arc
 * only; the Crown of Seasons comes with the four runes.
 */
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));

import { SeasonItemBanner } from '../components/season-item-banner';
import { arcSeasonOf, SEASONS } from '../../../lib/constants/game-config';
import { ACCESSORY_SPRITES, ACCESSORY_COLORS, HAT_SPRITES, HAT_COLORS } from '../../avatar/renderer/sprites';
import { composeHero } from '../../avatar/renderer/compose-hero';
import { lang$ } from '../../../lib/i18n';

const cape = {
  id: 'c1', name: 'Frost Cape', description: '', category: 'avatar_accessory', price_gold: 300, rarity: 'rare',
  required_level: 3, sprite_key: 'acc_cape_winter', is_available: false, season: 'winter', created_at: '',
} as never;

describe('arc of a day', () => {
  it('follows the calendar months, like arc_of', () => {
    expect(arcSeasonOf(new Date(2026, 9, 1))).toBe('winter');
    expect(arcSeasonOf(new Date(2026, 11, 31))).toBe('winter');
    expect(arcSeasonOf(new Date(2027, 0, 1))).toBe('spring');
    expect(arcSeasonOf(new Date(2027, 4, 15))).toBe('summer');
    expect(arcSeasonOf(new Date(2027, 8, 30))).toBe('autumn');
  });
});

describe('seasonal sprites', () => {
  it('draw a cape for every arc and the Crown of Seasons, with real colors only', () => {
    const LOOK = { skin: '#f4c98a', hair: '#4a3728', eye: '#1a1a2e' };
    for (const s of SEASONS) {
      const key = `acc_cape_${s}`;
      expect(ACCESSORY_SPRITES[key] && ACCESSORY_COLORS[key]).toBeTruthy();
      expect(composeHero({ ...LOOK, accessory: key }).flat()).not.toContain('#ff00ff');
    }
    expect(HAT_SPRITES.hat_seasons && HAT_COLORS.hat_seasons).toBeTruthy();
    expect(composeHero({ ...LOOK, hat: 'hat_seasons' }).flat()).not.toContain('#ff00ff');
  });
});

describe('SeasonItemBanner', () => {
  beforeAll(() => lang$.set('en'));

  it('sells the arc cape for gold', () => {
    const onBuy = jest.fn();
    const { getByText, getByTestId } = render(
      <SeasonItemBanner item={cape} owned={false} equipped={false} look={{}} onBuy={onBuy} onEquip={jest.fn()} />,
    );
    expect(getByText('✨ WINTER ARC EDITION')).toBeTruthy();
    expect(getByText('On sale until the arc ends, back next year.')).toBeTruthy();
    fireEvent.press(getByTestId('season-item-buy'));
    expect(onBuy).toHaveBeenCalled();
  });

  it('lets an owner equip it', () => {
    const onEquip = jest.fn();
    const { getByText, queryByTestId } = render(
      <SeasonItemBanner item={cape} owned equipped={false} look={{}} onBuy={jest.fn()} onEquip={onEquip} />,
    );
    expect(queryByTestId('season-item-buy')).toBeNull();
    expect(getByText('Yours forever.')).toBeTruthy();
  });
});

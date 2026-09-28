jest.mock('expo-localization', () => ({ getLocales: () => [{ languageCode: 'fr' }] }));
jest.mock('../../storage/mmkv', () => ({
  storage: { getString: () => undefined, set: jest.fn(), delete: jest.fn() },
}));

import { STRINGS_FOR_TESTS } from '..';
import { categoryLabel, rarityLabel, titleLabel, stageDescription } from '../labels';

const FR = STRINGS_FOR_TESTS.fr;
const EN = STRINGS_FOR_TESTS.en;

describe('game labels', () => {
  it('translates categories, rarities and titles', () => {
    expect(categoryLabel(FR, 'fitness')).toBe('Sport');
    expect(rarityLabel(FR, 'legendary')).toBe('Légendaire');
    expect(titleLabel(FR, 'Warrior')).toBe('Guerrier');
    expect(titleLabel(EN, 'Warrior')).toBe('Warrior');
    expect(stageDescription(FR, 'Knight', 'x')).toBe('La discipline est ton armure.');
  });

  it('falls back to the raw value for unknown keys', () => {
    expect(categoryLabel(FR, 'underwater_basket')).toBe('underwater_basket');
    expect(titleLabel(FR, 'Overlord')).toBe('Overlord');
  });
});

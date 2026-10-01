jest.mock('react-native', () => ({ Linking: { openURL: jest.fn(() => Promise.resolve()) } }));

import { legalUrl } from '../legal-links';

describe('legalUrl', () => {
  it('opens the privacy policy in the player language', () => {
    expect(legalUrl('privacy', 'fr')).toBe('https://battisteb.github.io/habitquest/privacy-policy.fr');
    expect(legalUrl('privacy', 'en')).toBe('https://battisteb.github.io/habitquest/privacy-policy');
  });

  it('has bilingual terms and support pages', () => {
    expect(legalUrl('terms', 'fr')).toBe('https://battisteb.github.io/habitquest/terms');
    expect(legalUrl('support', 'en')).toBe('https://battisteb.github.io/habitquest/support');
  });
});

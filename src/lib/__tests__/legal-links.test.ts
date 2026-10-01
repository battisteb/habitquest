jest.mock('react-native', () => ({ Linking: { openURL: jest.fn(() => Promise.resolve()) } }));

import { legalUrl } from '../legal-links';

describe('legalUrl', () => {
  it('opens the privacy policy in the player language', () => {
    expect(legalUrl('privacy', 'fr')).toBe('https://gethabitquest.com/privacy-policy.fr');
    expect(legalUrl('privacy', 'en')).toBe('https://gethabitquest.com/privacy-policy');
  });

  it('has bilingual terms and support pages', () => {
    expect(legalUrl('terms', 'fr')).toBe('https://gethabitquest.com/terms');
    expect(legalUrl('support', 'en')).toBe('https://gethabitquest.com/support');
  });
});

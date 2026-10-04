jest.mock('react-native', () => ({ Linking: { openURL: jest.fn(() => Promise.resolve()) } }));

import { legalUrl } from '../legal-links';

describe('legalUrl', () => {
  it('opens the privacy policy in the player language', () => {
    expect(legalUrl('privacy', 'fr')).toBe('https://gethabitquest.com/privacy-policy.fr');
    expect(legalUrl('privacy', 'en')).toBe('https://gethabitquest.com/privacy-policy');
  });

  it('opens terms and help in the player language too', () => {
    expect(legalUrl('terms', 'fr')).toBe('https://gethabitquest.com/terms.fr');
    expect(legalUrl('terms', 'en')).toBe('https://gethabitquest.com/terms');
    expect(legalUrl('support', 'fr')).toBe('https://gethabitquest.com/support.fr');
    expect(legalUrl('support', 'en')).toBe('https://gethabitquest.com/support');
  });

  it('opens the Japanese and Korean pages of the site', () => {
    expect(legalUrl('privacy', 'ja')).toBe('https://gethabitquest.com/privacy-policy.ja');
    expect(legalUrl('terms', 'ko')).toBe('https://gethabitquest.com/terms.ko');
    expect(legalUrl('support', 'ko')).toBe('https://gethabitquest.com/support.ko');
  });
});

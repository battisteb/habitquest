/**
 * App Store guideline 2.3.10: the iPhone app must not name other platforms. The Premium screen's
 * legal lines take the store of the phone ({store}) instead of "Apple ID / Google Play".
 */
import { STRINGS_FOR_TESTS } from '../../../lib/i18n';

describe('Premium legal lines name only the store of the phone', () => {
  for (const [lang, T] of Object.entries(STRINGS_FOR_TESTS)) {
    it(lang, () => {
      for (const key of ['paywall_legal', 'paywall_active_manage'] as const) {
        expect(T[key]).toContain('{store}');
        expect(T[key]).not.toMatch(/Google Play|Apple ID|App Store/);
      }
    });
  }
});

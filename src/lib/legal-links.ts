import { Linking } from 'react-native';
import type { Lang } from './i18n';

const SITE = 'https://gethabitquest.com';

export type LegalPage = 'privacy' | 'terms' | 'support';

/** Public pages required by the stores (privacy policy, terms of use) and the help page. */
export function legalUrl(page: LegalPage, lang: Lang): string {
  if (page === 'privacy') return `${SITE}/${lang === 'fr' ? 'privacy-policy.fr' : 'privacy-policy'}`;
  return `${SITE}/${page}`;
}

export function openLegalPage(page: LegalPage, lang: Lang): void {
  void Linking.openURL(legalUrl(page, lang)).catch(() => {
    // No browser available: nothing else to do.
  });
}

import { Linking } from 'react-native';
import type { Lang } from './i18n';

const SITE = 'https://gethabitquest.com';

export type LegalPage = 'privacy' | 'terms' | 'support';

/** Public pages required by the stores (privacy policy, terms of use) and the help page. */
export function legalUrl(page: LegalPage, lang: Lang): string {
  const name = page === 'privacy' ? 'privacy-policy' : page;
  return `${SITE}/${lang === 'en' ? name : `${name}.${lang}`}`;
}

export function openLegalPage(page: LegalPage, lang: Lang): void {
  void Linking.openURL(legalUrl(page, lang)).catch(() => {
    // No browser available: nothing else to do.
  });
}

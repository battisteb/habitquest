import type { Lang } from '../../../lib/i18n';

/**
 * Prices shown before the stores answer (or on the web). The real prices
 * always come from the App Store / Google Play through RevenueCat.
 */
export const FALLBACK_PRICES = { monthly: 5.99, annual: 39.99, currency: 'USD' };

/** "$5.99" / "5,99 $US" in the player's language, in the store's currency. */
export function formatPrice(amount: number, currency: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(lang === 'fr' ? 'fr-FR' : 'en-US', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/** What the annual plan costs per month. */
export function annualPerMonth(annual: number): number {
  return Math.floor((annual / 12) * 100) / 100;
}

/** Saving of the annual plan over twelve months, in whole percent. */
export function annualSavingsPercent(monthly: number, annual: number): number {
  if (monthly <= 0) return 0;
  return Math.max(0, Math.round((1 - annual / (monthly * 12)) * 100));
}

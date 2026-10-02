// What a RevenueCat event does to a player's Premium status. Pure logic, no
// Deno import, so Jest tests it (src/features/monetization/__tests__/premium-update.test.ts).

export const PRODUCT_LIFETIME = 'habitquest_premium_lifetime';

export interface PremiumEvent {
  type: string;
  product_id?: string | null;
  expiration_at_ms?: number | null;
}

export interface CurrentPremium {
  subscription_status: string | null;
  subscription_expires_at: string | null;
}

export interface PremiumUpdate {
  subscription_status: 'premium' | 'free';
  subscription_expires_at: string | null;
}

/** Events that take a purchase back (refund, revocation). */
const TAKEN_BACK = new Set(['CANCELLATION', 'EXPIRATION']);

/**
 * The new status, or null to leave the profile as it is.
 *
 * Lifetime Premium (I10) is a one-time purchase with no expiry. Once a
 * player owns it, the end of an older subscription must not take Premium
 * away: only an event about the lifetime product itself can (a refund).
 */
export function premiumUpdate(event: PremiumEvent, current: CurrentPremium | null, now = Date.now()): PremiumUpdate | null {
  const lifetimeEvent = event.product_id === PRODUCT_LIFETIME;
  const ownsLifetime = current?.subscription_status === 'premium' && current.subscription_expires_at === null;

  if (lifetimeEvent) {
    return TAKEN_BACK.has(event.type)
      ? { subscription_status: 'free', subscription_expires_at: null }
      : { subscription_status: 'premium', subscription_expires_at: null };
  }

  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms) : null;
  const active = event.type !== 'EXPIRATION' && (expiresAt === null || expiresAt.getTime() > now);

  // A subscription event never downgrades nor shortens a lifetime Premium.
  if (ownsLifetime) return null;

  return {
    subscription_status: active ? 'premium' : 'free',
    subscription_expires_at: expiresAt?.toISOString() ?? null,
  };
}

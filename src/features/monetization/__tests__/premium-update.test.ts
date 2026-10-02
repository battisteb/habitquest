import { PRODUCT_LIFETIME, premiumUpdate } from '../../../../supabase/functions/revenuecat-webhook/premium-update';

const NOW = Date.parse('2026-10-02T12:00:00Z');
const NEXT_YEAR = Date.parse('2027-10-02T12:00:00Z');
const free = { subscription_status: 'free', subscription_expires_at: null };
const yearly = { subscription_status: 'premium', subscription_expires_at: '2027-10-02T12:00:00.000Z' };
const lifetime = { subscription_status: 'premium', subscription_expires_at: null };

describe('RevenueCat events → Premium status', () => {
  it('starts a subscription until its expiry', () => {
    expect(premiumUpdate({ type: 'INITIAL_PURCHASE', product_id: 'habitquest_premium_annual', expiration_at_ms: NEXT_YEAR }, free, NOW))
      .toEqual({ subscription_status: 'premium', subscription_expires_at: '2027-10-02T12:00:00.000Z' });
  });

  it('ends a subscription when it expires', () => {
    expect(premiumUpdate({ type: 'EXPIRATION', product_id: 'habitquest_premium_annual', expiration_at_ms: NOW - 1 }, yearly, NOW))
      .toEqual({ subscription_status: 'free', subscription_expires_at: new Date(NOW - 1).toISOString() });
  });

  it('gives lifetime Premium with no end date', () => {
    expect(premiumUpdate({ type: 'NON_RENEWING_PURCHASE', product_id: PRODUCT_LIFETIME, expiration_at_ms: null }, yearly, NOW))
      .toEqual({ subscription_status: 'premium', subscription_expires_at: null });
  });

  it('never lets an old subscription take lifetime Premium away', () => {
    expect(premiumUpdate({ type: 'EXPIRATION', product_id: 'habitquest_premium_annual', expiration_at_ms: NOW - 1 }, lifetime, NOW)).toBeNull();
    expect(premiumUpdate({ type: 'RENEWAL', product_id: 'habitquest_premium_monthly', expiration_at_ms: NEXT_YEAR }, lifetime, NOW)).toBeNull();
  });

  it('takes lifetime Premium back on a refund', () => {
    expect(premiumUpdate({ type: 'CANCELLATION', product_id: PRODUCT_LIFETIME }, lifetime, NOW))
      .toEqual({ subscription_status: 'free', subscription_expires_at: null });
  });
});

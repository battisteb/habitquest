/**
 * premium$: one Premium status for every screen and limit, from the phone
 * purchase (RevenueCat) or the server (webhook, trials, grants; web).
 */
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('react-native-purchases', () => ({}), { virtual: true });

import { premium$ } from '../stores/premium';
import { subscriptionStore$ } from '../stores/subscription-store';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { getMaxFreezeTokens, canViewShopItem, LIMITS } from '../utils/feature-gates';

const profile = (status: string, expires: string | null) =>
  ({ id: 'me', subscription_status: status, subscription_expires_at: expires }) as never;

describe('premium$', () => {
  beforeEach(() => {
    subscriptionStore$.isPremium.set(false);
    profileStore$.profile.set(null);
  });

  it('is false for a free player', () => {
    profileStore$.profile.set(profile('free', null));
    expect(premium$.get()).toBe(false);
    expect(getMaxFreezeTokens()).toBe(LIMITS.FREE_MAX_FREEZE_TOKENS);
  });

  it('follows a purchase seen on the phone', () => {
    subscriptionStore$.isPremium.set(true);
    expect(premium$.get()).toBe(true);
  });

  it('follows the server status, the only source on the web, for every limit', () => {
    profileStore$.profile.set(profile('premium', null));
    expect(premium$.get()).toBe(true);
    expect(getMaxFreezeTokens()).toBe(LIMITS.PREMIUM_MAX_FREEZE_TOKENS);
    expect(canViewShopItem('legendary')).toBe(true);
  });

  it('drops an expired server subscription, even during the session', () => {
    profileStore$.profile.set(profile('premium', new Date(Date.now() + 60_000).toISOString()));
    expect(premium$.get()).toBe(true);
    profileStore$.profile.set(profile('premium', new Date(Date.now() - 60_000).toISOString()));
    expect(premium$.get()).toBe(false);
  });
});

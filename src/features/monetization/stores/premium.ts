import { observable } from '@legendapp/state';
import { subscriptionStore$ } from './subscription-store';
import { profileStore$, isServerPremium } from '../../gamification/stores/profile-store';

/**
 * The player's Premium status, the one every screen and limit reads.
 * Two sources: the purchase seen by RevenueCat on the phone, and the server
 * status (RevenueCat webhook, trials or grants), the only source on the web.
 * Computed, so it follows both, including an expiry during the session.
 */
export const premium$ = observable(
  () =>
    subscriptionStore$.isPremium.get() ||
    (() => {
      const profile = profileStore$.profile.get();
      return !!profile && isServerPremium(profile);
    })(),
);

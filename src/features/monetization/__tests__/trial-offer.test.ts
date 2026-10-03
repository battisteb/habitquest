/**
 * 14-day free trial: when it is offered (once after the tutorial, then
 * spaced reminders) and how a trial in progress is read from the store.
 */
jest.mock('react-native-purchases', () => ({}), { virtual: true });

import {
  loadTrialOfferState,
  recordTrialOfferRefused,
  recordTrialOfferShown,
  shouldOfferTrialAfterTutorial,
  shouldRemindTrial,
  shouldOfferTrialAtStreak,
  recordStreakOfferShown,
  STREAK_OFFER_DAYS,
  trialDaysLeft,
  trialEndNoticeAt,
  MAX_REFUSALS,
  type TrialOfferState,
} from '../utils/trial-offer';
import { packageHasFreeTrial, trialEndFromCustomerInfo } from '../stores/subscription-store';
import { storage } from '../../../lib/storage/mmkv';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 2, 12);
const fresh: TrialOfferState = { firstSeenAt: NOW, lastShownAt: 0, refusals: 0, introShown: false };
const eligible = { eligible: true, isPremium: false };

describe('after the tutorial', () => {
  it('offers the trial once to an eligible free player', () => {
    expect(shouldOfferTrialAfterTutorial(fresh, eligible)).toBe(true);
    expect(shouldOfferTrialAfterTutorial({ ...fresh, introShown: true }, eligible)).toBe(false);
  });

  it('never to a Premium player or when the store has no trial for them (web, already used)', () => {
    expect(shouldOfferTrialAfterTutorial(fresh, { eligible: true, isPremium: true })).toBe(false);
    expect(shouldOfferTrialAfterTutorial(fresh, { eligible: false, isPremium: false })).toBe(false);
  });
});

describe('at the first 21-day streak (G5)', () => {
  it('offers the trial once, at 21 days', () => {
    expect(STREAK_OFFER_DAYS).toBe(21);
    expect(shouldOfferTrialAtStreak(fresh, eligible, 21)).toBe(true);
    expect(shouldOfferTrialAtStreak(fresh, eligible, 7)).toBe(false);
    expect(shouldOfferTrialAtStreak({ ...fresh, streakOfferShown: true }, eligible, 21)).toBe(false);
  });

  it('even after 3 "Later", but never to Premium or ineligible players', () => {
    expect(shouldOfferTrialAtStreak({ ...fresh, refusals: MAX_REFUSALS }, eligible, 21)).toBe(true);
    expect(shouldOfferTrialAtStreak(fresh, { eligible: true, isPremium: true }, 21)).toBe(false);
    expect(shouldOfferTrialAtStreak(fresh, { eligible: false, isPremium: false }, 21)).toBe(false);
  });

  it('remembers it was shown', () => {
    storage.delete('trial-offer-v1');
    recordStreakOfferShown(NOW);
    expect(loadTrialOfferState(NOW).streakOfferShown).toBe(true);
    storage.delete('trial-offer-v1');
  });
});

describe('reminders', () => {
  const seen = { ...fresh, introShown: true, lastShownAt: NOW };

  it('wait 24 hours after the first launch', () => {
    expect(shouldRemindTrial({ ...seen, lastShownAt: 0 }, eligible, NOW + DAY - 1)).toBe(false);
    expect(shouldRemindTrial({ ...seen, lastShownAt: 0 }, eligible, NOW + DAY)).toBe(true);
  });

  it('come at most once every 3 days', () => {
    expect(shouldRemindTrial(seen, eligible, NOW + 2 * DAY)).toBe(false);
    expect(shouldRemindTrial(seen, eligible, NOW + 3 * DAY)).toBe(true);
  });

  it(`stop after ${MAX_REFUSALS} refusals`, () => {
    expect(shouldRemindTrial({ ...seen, refusals: MAX_REFUSALS - 1 }, eligible, NOW + 10 * DAY)).toBe(true);
    expect(shouldRemindTrial({ ...seen, refusals: MAX_REFUSALS }, eligible, NOW + 10 * DAY)).toBe(false);
  });

  it('stop once Premium or no longer eligible', () => {
    expect(shouldRemindTrial(seen, { eligible: true, isPremium: true }, NOW + 10 * DAY)).toBe(false);
    expect(shouldRemindTrial(seen, { eligible: false, isPremium: false }, NOW + 10 * DAY)).toBe(false);
  });
});

describe('stored state', () => {
  beforeEach(() => storage.delete('trial-offer-v1'));

  it('remembers the first launch, what was shown and the refusals', () => {
    expect(loadTrialOfferState(NOW)).toEqual(fresh);
    recordTrialOfferShown(true, NOW + DAY);
    recordTrialOfferRefused(NOW + DAY);
    expect(loadTrialOfferState(NOW + 2 * DAY)).toEqual({ firstSeenAt: NOW, lastShownAt: NOW + DAY, refusals: 1, introShown: true });
  });
});

describe('trial in progress', () => {
  const ends = new Date(NOW + 5 * DAY + 3600_000).toISOString();

  it('counts the days left and warns 2 days before the end', () => {
    expect(trialDaysLeft(ends, NOW)).toBe(5);
    expect(trialDaysLeft(new Date(NOW + 3600_000).toISOString(), NOW)).toBe(0);
    expect(trialDaysLeft(new Date(NOW - 1).toISOString(), NOW)).toBeNull();
    expect(trialDaysLeft(null, NOW)).toBeNull();
    expect(trialEndNoticeAt(ends, NOW)?.getTime()).toBe(NOW + 3 * DAY + 3600_000);
    expect(trialEndNoticeAt(new Date(NOW + DAY).toISOString(), NOW)).toBeNull();
  });

  it('is read from the active entitlement of the store', () => {
    const info = (periodType: string) => ({ entitlements: { active: { premium: { periodType, expirationDate: ends } } } });
    expect(trialEndFromCustomerInfo(info('TRIAL'))).toBe(ends);
    expect(trialEndFromCustomerInfo(info('NORMAL'))).toBeNull();
    expect(trialEndFromCustomerInfo(null)).toBeNull();
  });

  it('detects a free trial on iOS (free intro offer) and Android (free phase)', () => {
    expect(packageHasFreeTrial({ product: { introPrice: { price: 0 } } })).toBe(true);
    expect(packageHasFreeTrial({ product: { introPrice: { price: 0.99 } } })).toBe(false);
    expect(packageHasFreeTrial({ product: { introPrice: null, defaultOption: { freePhase: { billingPeriod: {} } } } })).toBe(true);
    expect(packageHasFreeTrial({ product: { introPrice: null, defaultOption: { freePhase: null } } })).toBe(false);
  });
});

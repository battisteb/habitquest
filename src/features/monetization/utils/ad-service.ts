import {
  BannerAdSize,
  InterstitialAd,
  AdEventType,
  TestIds,
  RewardedInterstitialAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { Platform } from 'react-native';
import { subscriptionStore$ } from '../stores/subscription-store';

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────
// TODO: Replace XXXXXXXXXXXXXXXX with real IDs from AdMob console before production release.
// Until then, TestIds are used in all environments — safe, no policy violation.
const PROD_BANNER_IOS = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const PROD_BANNER_AND = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const PROD_INTER_IOS  = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const PROD_INTER_AND  = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

const isAdMobConfigured = !PROD_BANNER_IOS.includes('XXXX');

export const ADMOB_IDS = {
  banner: (!__DEV__ && isAdMobConfigured)
    ? Platform.select({ ios: PROD_BANNER_IOS, android: PROD_BANNER_AND, default: TestIds.BANNER })!
    : TestIds.BANNER,
  interstitial: (!__DEV__ && isAdMobConfigured)
    ? Platform.select({ ios: PROD_INTER_IOS, android: PROD_INTER_AND, default: TestIds.INTERSTITIAL })!
    : TestIds.INTERSTITIAL,
};

export { BannerAdSize };

// ─── Interstitial (before duel, after All Done) ───────────────────────────────
let _interstitial: InterstitialAd | null = null;
let _interstitialLoaded = false;

export function preloadInterstitial(): void {
  if (subscriptionStore$.isPremium.get()) return; // Never load ads for premium
  _interstitial = InterstitialAd.createForAdRequest(ADMOB_IDS.interstitial, {
    requestNonPersonalizedAdsOnly: false,
  });
  _interstitial.addAdEventListener(AdEventType.LOADED, () => {
    _interstitialLoaded = true;
  });
  _interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    _interstitialLoaded = false;
    // Preload the next one
    preloadInterstitial();
  });
  _interstitial.addAdEventListener(AdEventType.ERROR, () => {
    _interstitialLoaded = false;
  });
  _interstitial.load();
}

/**
 * Show an interstitial ad if premium check passes.
 * Calls `onComplete` when the ad closes (or immediately if premium / ad not loaded).
 */
export function showInterstitial(onComplete?: () => void): void {
  if (subscriptionStore$.isPremium.get() || !_interstitialLoaded || !_interstitial) {
    onComplete?.();
    return;
  }
  _interstitial.addAdEventListener(AdEventType.CLOSED, () => onComplete?.());
  _interstitial.show();
}

// ─── Rewarded interstitial (opt-in extra freeze) ──────────────────────────────
// Not used yet — hook available for future "watch an ad to earn a freeze" feature
let _rewarded: RewardedInterstitialAd | null = null;
let _rewardedLoaded = false;

export function preloadRewardedInterstitial(): void {
  if (subscriptionStore$.isPremium.get()) return;
  _rewarded = RewardedInterstitialAd.createForAdRequest(ADMOB_IDS.interstitial);
  _rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
    _rewardedLoaded = true;
  });
  _rewarded.addAdEventListener(AdEventType.CLOSED, () => {
    _rewardedLoaded = false;
    preloadRewardedInterstitial();
  });
  _rewarded.load();
}

export function showRewardedInterstitial(
  onRewarded: () => void,
  onComplete?: () => void,
): void {
  if (!_rewardedLoaded || !_rewarded) {
    onComplete?.();
    return;
  }
  _rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => onRewarded());
  _rewarded.addAdEventListener(AdEventType.CLOSED, () => onComplete?.());
  _rewarded.show();
}

// ─── Helper: should show ads ──────────────────────────────────────────────────
export function shouldShowAds(): boolean {
  return !subscriptionStore$.isPremium.get();
}

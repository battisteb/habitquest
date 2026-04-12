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
// Replace with real IDs from AdMob console before production release.
// TestIds are safe for development (no policy violation).
const IS_DEV = __DEV__;

export const ADMOB_IDS = {
  banner: IS_DEV
    ? TestIds.BANNER
    : Platform.select({
        ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        default: TestIds.BANNER,
      })!,
  interstitial: IS_DEV
    ? TestIds.INTERSTITIAL
    : Platform.select({
        ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
        default: TestIds.INTERSTITIAL,
      })!,
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

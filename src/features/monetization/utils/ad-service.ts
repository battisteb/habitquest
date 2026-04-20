import { Platform } from 'react-native';
import { subscriptionStore$ } from '../stores/subscription-store';

// AdMob is native-only — not available on web
const isNative = Platform.OS !== 'web';

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────
// TODO: Replace XXXXXXXXXXXXXXXX with real IDs from AdMob console before production release.
// Until then, TestIds are used in all environments — safe, no policy violation.
const PROD_BANNER_IOS = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const PROD_BANNER_AND = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const PROD_INTER_IOS  = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';
const PROD_INTER_AND  = 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX';

const isAdMobConfigured = !PROD_BANNER_IOS.includes('XXXX');

// Lazily resolved once at runtime so web never imports the native module
let _TestIds: Record<string, string> | null = null;
function getTestIds() {
  if (!_TestIds && isNative) {
    _TestIds = require('react-native-google-mobile-ads').TestIds;
  }
  return _TestIds ?? { BANNER: '', INTERSTITIAL: '' };
}

export const ADMOB_IDS = {
  get banner() {
    if (!isNative) return '';
    const ids = getTestIds();
    return (!__DEV__ && isAdMobConfigured)
      ? Platform.select({ ios: PROD_BANNER_IOS, android: PROD_BANNER_AND, default: ids.BANNER })!
      : ids.BANNER;
  },
  get interstitial() {
    if (!isNative) return '';
    const ids = getTestIds();
    return (!__DEV__ && isAdMobConfigured)
      ? Platform.select({ ios: PROD_INTER_IOS, android: PROD_INTER_AND, default: ids.INTERSTITIAL })!
      : ids.INTERSTITIAL;
  },
};

// Re-export BannerAdSize for use in ad-banner.tsx (native only)
export { isNative as isAdNative };

// ─── Interstitial (before duel, after All Done) ───────────────────────────────
let _interstitial: any = null;
let _interstitialLoaded = false;

export function preloadInterstitial(): void {
  if (!isNative) return;
  if (subscriptionStore$.isPremium.get()) return;
  try {
    const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
    _interstitial = InterstitialAd.createForAdRequest(ADMOB_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: false,
    });
    _interstitial.addAdEventListener(AdEventType.LOADED, () => { _interstitialLoaded = true; });
    _interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      _interstitialLoaded = false;
      preloadInterstitial();
    });
    _interstitial.addAdEventListener(AdEventType.ERROR, () => { _interstitialLoaded = false; });
    _interstitial.load();
  } catch {
    // AdMob not available (web or unbuilt native)
  }
}

/**
 * Show an interstitial ad. Calls onComplete when closed (or immediately if unavailable).
 */
export function showInterstitial(onComplete?: () => void): void {
  if (!isNative || !_interstitialLoaded || !_interstitial) {
    onComplete?.();
    return;
  }
  if (subscriptionStore$.isPremium.get()) {
    onComplete?.();
    return;
  }
  try {
    const { AdEventType } = require('react-native-google-mobile-ads');
    _interstitial.addAdEventListener(AdEventType.CLOSED, () => onComplete?.());
    _interstitial.show();
  } catch {
    onComplete?.();
  }
}

// ─── Rewarded interstitial (opt-in extra freeze) ──────────────────────────────
let _rewarded: any = null;
let _rewardedLoaded = false;

export function preloadRewardedInterstitial(): void {
  if (!isNative) return;
  if (subscriptionStore$.isPremium.get()) return;
  try {
    const { RewardedInterstitialAd, AdEventType, RewardedAdEventType } =
      require('react-native-google-mobile-ads');
    _rewarded = RewardedInterstitialAd.createForAdRequest(ADMOB_IDS.interstitial);
    _rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => { _rewardedLoaded = true; });
    _rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      _rewardedLoaded = false;
      preloadRewardedInterstitial();
    });
    _rewarded.load();
  } catch {
    // AdMob not available
  }
}

export function showRewardedInterstitial(
  onRewarded: () => void,
  onComplete?: () => void,
): void {
  if (!isNative || !_rewardedLoaded || !_rewarded) {
    onComplete?.();
    return;
  }
  try {
    const { RewardedAdEventType, AdEventType } = require('react-native-google-mobile-ads');
    _rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => onRewarded());
    _rewarded.addAdEventListener(AdEventType.CLOSED, () => onComplete?.());
    _rewarded.show();
  } catch {
    onComplete?.();
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
export function shouldShowAds(): boolean {
  return isNative && !subscriptionStore$.isPremium.get();
}

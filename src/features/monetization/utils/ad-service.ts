import { Platform } from 'react-native';
import { canPersonalizeAds } from './tracking-consent';
import { premium$ } from '../stores/premium';

// AdMob is native-only — not available on web
const isNative = Platform.OS !== 'web';

// ─── Ad Unit IDs ──────────────────────────────────────────────────────────────
// AdMob app IDs and ad units are per platform. The iOS app is not registered in
// AdMob yet: leave the iOS IDs empty until it is, so release builds show no ads on
// iOS rather than requesting Android units.
const PROD_BANNER_IOS = '';
const PROD_BANNER_AND = 'ca-app-pub-3756522162472324/4591462256';
const PROD_INTER_IOS  = '';
const PROD_INTER_AND  = 'ca-app-pub-3756522162472324/3414111958';

const isAdMobConfigured =
  Platform.OS === 'ios' ? PROD_BANNER_IOS !== '' && PROD_INTER_IOS !== '' : true;

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
  if (!shouldShowAds()) return;
  try {
    const { InterstitialAd, AdEventType } = require('react-native-google-mobile-ads');
    _interstitial = InterstitialAd.createForAdRequest(ADMOB_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: !canPersonalizeAds(),
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
  if (premium$.get()) {
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
  if (!shouldShowAds()) return;
  try {
    const { RewardedInterstitialAd, AdEventType, RewardedAdEventType } =
      require('react-native-google-mobile-ads');
    _rewarded = RewardedInterstitialAd.createForAdRequest(ADMOB_IDS.interstitial, {
      requestNonPersonalizedAdsOnly: !canPersonalizeAds(),
    });
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
  return isNative && (__DEV__ || isAdMobConfigured) && !premium$.get();
}

import { observable } from '@legendapp/state';
import { Platform } from 'react-native';

// react-native-purchases is native-only — lazy require to avoid web crashes
const isNative = Platform.OS !== 'web';
function getPurchases() {
  if (!isNative) return null;
  try { return require('react-native-purchases').default; } catch { return null; }
}
type CustomerInfo = any;
type PurchasesOffering = any;

// ─── Config ──────────────────────────────────────────────────────────────────
// RevenueCat API keys (public, safe to commit — server validates receipts)
// Android: Google Play app of the RevenueCat project (2026-10-07).
// iOS: test key until the App Store app exists (replace with appl_xxx).
const RC_API_KEY_IOS = 'test_EcuySjKKaOeChKkSDdLjEXCqAts';
const RC_API_KEY_ANDROID = 'goog_wLnMaPxinuoqgyTiUcasJWUlHrH';

function isRcConfigured(): boolean {
  return RC_API_KEY_IOS.length > 10 && RC_API_KEY_ANDROID.length > 10;
}

// RevenueCat entitlement ID configured in the dashboard
export const ENTITLEMENT_PREMIUM = 'premium';

// Product identifiers must match App Store Connect / Google Play Console
export const PRODUCT_MONTHLY = 'habitquest_premium_monthly';
export const PRODUCT_ANNUAL = 'habitquest_premium_annual';
/** One-time purchase, Premium for life (I10). Same id in the webhook (premium-update.ts). */
export const PRODUCT_LIFETIME = 'habitquest_premium_lifetime';

/**
 * Store product id without the Google Play base plan: Play subscriptions come
 * back from RevenueCat as "habitquest_premium_monthly:monthly".
 */
export function baseProductId(identifier: string): string {
  return identifier.split(':')[0];
}

/** The offering's package for one of our products, on iOS and Android alike. */
export function findPackage(offering: PurchasesOffering | null, productId: string): any {
  return offering?.availablePackages?.find((p: any) => baseProductId(p.product.identifier) === productId);
}

// ─── State ───────────────────────────────────────────────────────────────────
interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  error: string | null;
  /** Products (ids) the store offers a free trial on to this player. */
  trialProducts: string[];
  /** End of the free trial in progress (ISO), null when not in a trial. */
  trialEndsAt: string | null;
}

export const subscriptionStore$ = observable<SubscriptionState>({
  isPremium: false,
  isLoading: false,
  offering: null,
  customerInfo: null,
  error: null,
  trialProducts: [],
  trialEndsAt: null,
});

/** The trial in progress, from the active entitlement (periodType TRIAL). */
export function trialEndFromCustomerInfo(customerInfo: CustomerInfo | null): string | null {
  const ent = customerInfo?.entitlements?.active?.[ENTITLEMENT_PREMIUM];
  return ent && ent.periodType === 'TRIAL' && ent.expirationDate ? ent.expirationDate : null;
}

/** Whether a package starts with a free trial (iOS: free intro offer; Android: free phase). */
export function packageHasFreeTrial(pkg: any): boolean {
  const product = pkg?.product;
  if (!product) return false;
  if (product.introPrice) return product.introPrice.price === 0;
  return !!product.defaultOption?.freePhase;
}

function applyCustomerInfo(customerInfo: CustomerInfo): boolean {
  const isPremium = customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;
  subscriptionStore$.customerInfo.set(customerInfo);
  subscriptionStore$.isPremium.set(isPremium);
  subscriptionStore$.trialEndsAt.set(trialEndFromCustomerInfo(customerInfo));
  return isPremium;
}

// ─── Init ─────────────────────────────────────────────────────────────────────
let _initialized = false;

export async function initPurchases(userId: string): Promise<void> {
  if (_initialized) return;
  if (!isNative) {
    if (__DEV__) console.log('[RevenueCat] Web platform — skipping init (all users free on web)');
    return;
  }
  if (!isRcConfigured()) {
    if (__DEV__) console.log('[RevenueCat] Not configured — skipping init (all users free)');
    return;
  }
  const Purchases = getPurchases();
  if (!Purchases) return;
  try {
    if (__DEV__) {
      const { LOG_LEVEL } = require('react-native-purchases');
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    Purchases.configure({ apiKey, appUserID: userId });
    _initialized = true;

    await refreshSubscriptionStatus();
    // Prices and free trial eligibility, for the trial offer after the tutorial.
    await loadOfferings();
  } catch {
    // Non-critical — app works without subscription
  }
}

// ─── Refresh status from RevenueCat ──────────────────────────────────────────
export async function refreshSubscriptionStatus(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases) return;
  try {
    subscriptionStore$.isLoading.set(true);
    const customerInfo = await Purchases.getCustomerInfo();
    applyCustomerInfo(customerInfo);
    subscriptionStore$.error.set(null);

    // The server copy of the status comes from the RevenueCat webhook
    // (supabase/functions/revenuecat-webhook), not from the client.
  } catch {
    // Keep previous state on error
  } finally {
    subscriptionStore$.isLoading.set(false);
  }
}

// ─── Load offerings ───────────────────────────────────────────────────────────
export async function loadOfferings(): Promise<void> {
  const Purchases = getPurchases();
  if (!Purchases) return;
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      subscriptionStore$.offering.set(offerings.current);
      await refreshTrialEligibility();
    }
  } catch {
    // Offerings unavailable (no network, no products configured)
  }
}

// ─── Free trial eligibility ──────────────────────────────────────────────────
/**
 * Products with a free trial this player can still get. On Android the store
 * only lists offers the player is eligible for; on iOS it has to be asked.
 */
export async function refreshTrialEligibility(): Promise<void> {
  const Purchases = getPurchases();
  const offering = subscriptionStore$.offering.get();
  if (!Purchases || !offering) return;
  try {
    const withTrial = offering.availablePackages.filter(packageHasFreeTrial).map((p: any) => p.product.identifier as string);
    if (Platform.OS === 'ios' && withTrial.length > 0) {
      const ELIGIBLE = Purchases.INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
      const eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(withTrial);
      subscriptionStore$.trialProducts.set(
        withTrial.filter((id: string) => eligibility[id]?.status === ELIGIBLE).map(baseProductId),
      );
    } else {
      subscriptionStore$.trialProducts.set(withTrial.map(baseProductId));
    }
  } catch {
    subscriptionStore$.trialProducts.set([]);
  }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────
export async function purchaseSubscription(productIdentifier: string): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;
  try {
    subscriptionStore$.isLoading.set(true);
    subscriptionStore$.error.set(null);

    const offering = subscriptionStore$.offering.get();
    if (!offering) throw new Error('No offerings available');

    const pkg = findPackage(offering, productIdentifier);
    if (!pkg) throw new Error(`Product ${productIdentifier} not found`);

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium = applyCustomerInfo(customerInfo);
    subscriptionStore$.trialProducts.set([]);

    await refreshSubscriptionStatus();
    return isPremium;
  } catch (e: any) {
    if (!e?.userCancelled) {
      subscriptionStore$.error.set(e?.message ?? 'Purchase failed');
    }
    return false;
  } finally {
    subscriptionStore$.isLoading.set(false);
  }
}

// ─── Restore ──────────────────────────────────────────────────────────────────
export async function restorePurchases(): Promise<boolean> {
  const Purchases = getPurchases();
  if (!Purchases) return false;
  try {
    subscriptionStore$.isLoading.set(true);
    const customerInfo = await Purchases.restorePurchases();
    const isPremium = applyCustomerInfo(customerInfo);
    await refreshSubscriptionStatus();
    return isPremium;
  } catch {
    return false;
  } finally {
    subscriptionStore$.isLoading.set(false);
  }
}

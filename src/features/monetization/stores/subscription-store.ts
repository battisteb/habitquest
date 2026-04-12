import { observable } from '@legendapp/state';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';

// ─── Config ──────────────────────────────────────────────────────────────────
// RevenueCat API keys (public, safe to commit — server validates receipts)
const RC_API_KEY_IOS = 'appl_placeholder_replace_with_real_key';
const RC_API_KEY_ANDROID = 'goog_placeholder_replace_with_real_key';

// RevenueCat entitlement ID configured in the dashboard
export const ENTITLEMENT_PREMIUM = 'premium';

// Product identifiers must match App Store Connect / Google Play Console
export const PRODUCT_MONTHLY = 'habitquest_premium_monthly';
export const PRODUCT_ANNUAL = 'habitquest_premium_annual';

// ─── State ───────────────────────────────────────────────────────────────────
interface SubscriptionState {
  isPremium: boolean;
  isLoading: boolean;
  offering: PurchasesOffering | null;
  customerInfo: CustomerInfo | null;
  error: string | null;
}

export const subscriptionStore$ = observable<SubscriptionState>({
  isPremium: false,
  isLoading: false,
  offering: null,
  customerInfo: null,
  error: null,
});

// ─── Init ─────────────────────────────────────────────────────────────────────
let _initialized = false;

export async function initPurchases(userId: string): Promise<void> {
  if (_initialized) return;
  try {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    const apiKey = Platform.OS === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
    Purchases.configure({ apiKey, appUserID: userId });
    _initialized = true;

    await refreshSubscriptionStatus();
  } catch (e) {
    // Non-critical — app works without subscription
  }
}

// ─── Refresh status from RevenueCat ──────────────────────────────────────────
export async function refreshSubscriptionStatus(): Promise<void> {
  try {
    subscriptionStore$.isLoading.set(true);
    const customerInfo = await Purchases.getCustomerInfo();
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;

    subscriptionStore$.customerInfo.set(customerInfo);
    subscriptionStore$.isPremium.set(isPremium);
    subscriptionStore$.error.set(null);

    // Sync status to Supabase so edge functions can check it server-side
    const userId = authStore$.user.get()?.id;
    if (userId) {
      const expiresAt =
        customerInfo.entitlements.active[ENTITLEMENT_PREMIUM]?.expirationDate ?? null;
      await supabase
        .from('profiles')
        .update({
          subscription_status: isPremium ? 'premium' : 'free',
          subscription_expires_at: expiresAt,
          revenue_cat_id: customerInfo.originalAppUserId,
        })
        .eq('id', userId);
    }
  } catch {
    // Keep previous state on error
  } finally {
    subscriptionStore$.isLoading.set(false);
  }
}

// ─── Load offerings ───────────────────────────────────────────────────────────
export async function loadOfferings(): Promise<void> {
  try {
    const offerings = await Purchases.getOfferings();
    if (offerings.current) {
      subscriptionStore$.offering.set(offerings.current);
    }
  } catch {
    // Offerings unavailable (no network, no products configured)
  }
}

// ─── Purchase ─────────────────────────────────────────────────────────────────
export async function purchaseSubscription(productIdentifier: string): Promise<boolean> {
  try {
    subscriptionStore$.isLoading.set(true);
    subscriptionStore$.error.set(null);

    const offering = subscriptionStore$.offering.get();
    if (!offering) throw new Error('No offerings available');

    const pkg = offering.availablePackages.find(
      (p) => p.product.identifier === productIdentifier,
    );
    if (!pkg) throw new Error(`Product ${productIdentifier} not found`);

    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;
    subscriptionStore$.customerInfo.set(customerInfo);
    subscriptionStore$.isPremium.set(isPremium);

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
  try {
    subscriptionStore$.isLoading.set(true);
    const customerInfo = await Purchases.restorePurchases();
    const isPremium =
      customerInfo.entitlements.active[ENTITLEMENT_PREMIUM] !== undefined;
    subscriptionStore$.customerInfo.set(customerInfo);
    subscriptionStore$.isPremium.set(isPremium);
    await refreshSubscriptionStatus();
    return isPremium;
  } catch {
    return false;
  } finally {
    subscriptionStore$.isLoading.set(false);
  }
}

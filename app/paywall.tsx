import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useT, lang$ } from '../src/lib/i18n';
import { FALLBACK_PRICES, annualPerMonth, annualSavingsPercent, formatPrice } from '../src/features/monetization/utils/pricing';
import { openLegalPage } from '../src/lib/legal-links';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import {
  subscriptionStore$,
  loadOfferings,
  purchaseSubscription,
  restorePurchases,
  PRODUCT_MONTHLY,
  PRODUCT_ANNUAL,
  PRODUCT_LIFETIME,
} from '../src/features/monetization/stores/subscription-store';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';
import { premium$ } from '../src/features/monetization/stores/premium';
import { recordTrialOfferRefused, trialDaysLeft, TRIAL_DAYS } from '../src/features/monetization/utils/trial-offer';

const STORE_NAME = Platform.OS === 'android' ? 'Google Play' : 'App Store';

function formatDate(date: Date, lang: string): string {
  return date.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { day: 'numeric', month: 'long' });
}


export default function PaywallScreen() {
  const T = useT();
  const lang = use$(lang$);
  const { themeKey } = useTheme();

  const FEATURES = [
    { icon: '❄️', label: T.paywall_feat_freezes_label, free: T.paywall_feat_freezes_free, premium: T.paywall_feat_freezes_premium },
    { icon: '📊', label: T.paywall_feat_stats_label, free: T.paywall_feat_stats_free, premium: T.paywall_feat_stats_premium },
    { icon: '🛍️', label: T.paywall_feat_shop_label, free: T.paywall_feat_shop_free, premium: T.paywall_feat_shop_premium },
    { icon: '🚫', label: T.paywall_feat_ads_label, free: T.paywall_feat_ads_free, premium: T.paywall_feat_ads_premium },
    { icon: '🐉', label: T.paywall_feat_companion_label, free: T.paywall_feat_companion_free, premium: T.paywall_feat_companion_premium },
    { icon: '🎁', label: T.paywall_feat_monthly_label, free: T.paywall_feat_monthly_free, premium: T.paywall_feat_monthly_premium },
    { icon: '⚡', label: T.paywall_feat_support_label, free: T.paywall_feat_support_free, premium: T.paywall_feat_support_premium },
  ];
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 0,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.textMuted, fontSize: pixelSize(14), fontFamily: fonts.bold },
  badge: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: gold,
    letterSpacing: 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: gold + '66',
    borderRadius: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },

  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  heroEmoji: { fontSize: 56 },
  heroTitle: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: pixelSize(28),
  },
  heroSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Feature table
  table: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  tableCol: {
    flex: 1,
    fontSize: pixelSize(9),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  tableColCenter: { textAlign: 'center' },
  premiumCol: { color: gold },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '44',
    paddingVertical: 8,
    paddingHorizontal: spacing.sm,
  },
  tableCell: { flex: 1, justifyContent: 'center' },
  tableCellCenter: { alignItems: 'center' },
  premiumCell: { backgroundColor: gold + '08' },
  featureIcon: { fontSize: 14 },
  featureLabel: { fontSize: pixelSize(fontSizes.xs), color: colors.text, fontFamily: fonts.bold, flex: 1 },
  freeText: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  premiumText: { fontSize: pixelSize(9), color: gold, fontFamily: fonts.bold, textAlign: 'center' },

  // Plans
  plans: { flexDirection: 'row', gap: spacing.sm },
  plan: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  planSelected: { borderColor: gold, backgroundColor: gold + '11' },
  planLifetime: { flex: 0, marginTop: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planBadgeRow: { height: 20, justifyContent: 'center' },
  popularBadge: {
    backgroundColor: gold,
    borderRadius: 0,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  popularBadgeText: { fontSize: pixelSize(8), fontFamily: fonts.bold, color: '#000', letterSpacing: 1 },
  planPeriod: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.text, letterSpacing: 1 },
  planPrice: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: gold },
  planSub: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },

  // CTA
  cta: {
    backgroundColor: gold,
    borderRadius: 0,
    borderWidth: 3,
    borderColor: '#B8860B',
    borderBottomWidth: 5,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
    color: '#000',
    letterSpacing: 1,
  },

  webNotice: {
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  webNoticeText: {
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
    lineHeight: 20,
  },
  trialNote: {
    fontSize: fontSizes.sm,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  legal: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  legalLink: { fontSize: fontSizes.xs, color: colors.textSecondary, textDecorationLine: 'underline' },
  restoreBtn: { alignItems: 'center', paddingVertical: spacing.sm },
  restoreText: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
  },
}), [themeKey]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isLoading = use$(subscriptionStore$.isLoading);
  const offering = use$(subscriptionStore$.offering);
  const isPremium = use$(premium$);
  const trialProducts = use$(subscriptionStore$.trialProducts);
  const trialEndsAt = use$(subscriptionStore$.trialEndsAt);
  // Opened by the post-tutorial offer or a reminder: closing it is a "no thanks".
  const { from } = useLocalSearchParams<{ from?: string }>();
  const [selected, setSelected] = useState<'monthly' | 'annual' | 'lifetime'>('annual');

  function close() {
    if ((from === 'tutorial' || from === 'reminder') && !premium$.get()) recordTrialOfferRefused();
    router.back();
  }

  useEffect(() => {
    loadOfferings();
  }, []);


  const monthlyPkg = offering?.availablePackages.find(
    (p: any) => p.product.identifier === PRODUCT_MONTHLY,
  );
  const annualPkg = offering?.availablePackages.find(
    (p: any) => p.product.identifier === PRODUCT_ANNUAL,
  );
  const lifetimePkg = offering?.availablePackages.find(
    (p: any) => p.product.identifier === PRODUCT_LIFETIME,
  );

  // Store prices (RevenueCat); dollar fallbacks before they load and on the web.
  const currency = annualPkg?.product.currencyCode ?? monthlyPkg?.product.currencyCode ?? FALLBACK_PRICES.currency;
  const monthlyAmount = monthlyPkg?.product.price ?? FALLBACK_PRICES.monthly;
  const annualAmount = annualPkg?.product.price ?? FALLBACK_PRICES.annual;
  const monthlyPrice = monthlyPkg?.product.priceString ?? formatPrice(FALLBACK_PRICES.monthly, currency, lang);
  const annualPrice = annualPkg?.product.priceString ?? formatPrice(FALLBACK_PRICES.annual, currency, lang);
  const annualMonthly = T.paywall_per_month.replace('{price}', formatPrice(annualPerMonth(annualAmount), currency, lang));
  const annualSavings = annualSavingsPercent(monthlyAmount, annualAmount);
  const lifetimePrice = lifetimePkg?.product.priceString ?? formatPrice(FALLBACK_PRICES.lifetime, currency, lang);
  const selectedPrice = selected === 'lifetime' ? lifetimePrice : selected === 'annual' ? annualPrice : monthlyPrice;

  const selectedId = selected === 'monthly' ? PRODUCT_MONTHLY : selected === 'lifetime' ? PRODUCT_LIFETIME : PRODUCT_ANNUAL;
  const hasTrial = trialProducts.length > 0;
  const selectedTrial = trialProducts.includes(selectedId);
  const trialStart = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = trialDaysLeft(trialEndsAt);

  async function handlePurchase() {
    const success = await purchaseSubscription(selectedId);
    const error = subscriptionStore$.error.get();
    if (!success && error) {
      // Cancelling is silent; any other failure is explained.
      Alert.alert(T.paywall_error_title, T.paywall_error_msg);
      return;
    }
    if (success) {
      Alert.alert(
        T.paywall_welcome_title,
        T.paywall_welcome_msg,
        [{ text: T.paywall_welcome_ok, onPress: () => router.back() }],
      );
    }
  }

  async function handleRestore() {
    const success = await restorePurchases();
    if (success) {
      Alert.alert(T.paywall_restored_title, T.paywall_restored_msg);
    } else {
      Alert.alert(T.paywall_no_purchase_title, T.paywall_no_purchase_msg);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={close} style={styles.closeBtn} accessibilityLabel="close">
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.badge}>{T.paywall_badge}</Text>
      </View>

      {isPremium ? (
        // Already subscribed (or just bought): what Premium gives, and where to manage it.
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} testID="paywall-active">
          <View style={styles.hero}>
            <Text style={styles.heroEmoji}>👑</Text>
            <Text style={styles.heroTitle}>{T.paywall_active_title}</Text>
            <Text style={styles.heroSub}>{T.paywall_active_sub}</Text>
          </View>
          <View style={styles.table}>
            {FEATURES.map((f) => (
              <View key={f.label} style={styles.tableRow}>
                <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', gap: 6 }]}>
                  <Text style={styles.featureIcon}>{f.icon}</Text>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                </View>
                <View style={[styles.tableCell, styles.tableCellCenter, styles.premiumCell]}>
                  <Text style={styles.premiumText}>{f.premium}</Text>
                </View>
              </View>
            ))}
          </View>
          {daysLeft !== null && trialEndsAt && (
            <Text style={styles.trialNote} testID="paywall-trial-active">
              {T.paywall_trial_active
                .replace('{n}', String(daysLeft))
                .replace('{date}', formatDate(new Date(trialEndsAt), lang))
                .replace('{store}', STORE_NAME)}
            </Text>
          )}
          <Text style={styles.legal}>{Platform.OS === 'web' ? T.paywall_active_manage_web : T.paywall_active_manage}</Text>
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>👑</Text>
          <Text style={styles.heroTitle}>{hasTrial ? T.paywall_trial_title : T.paywall_hero_title}</Text>
          <Text style={styles.heroSub}>{hasTrial ? T.paywall_trial_sub : T.paywall_hero_sub}</Text>
        </View>

        {/* Feature comparison */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>{T.paywall_table_feature}</Text>
            <Text style={[styles.tableCol, styles.tableColCenter]}>{T.paywall_table_free}</Text>
            <Text style={[styles.tableCol, styles.tableColCenter, styles.premiumCol]}>
              {T.paywall_table_premium}
            </Text>
          </View>
          {FEATURES.map((f) => (
            <View key={f.label} style={styles.tableRow}>
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', gap: 6 }]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={styles.featureLabel}>{f.label}</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellCenter]}>
                <Text style={styles.freeText}>{f.free}</Text>
              </View>
              <View style={[styles.tableCell, styles.tableCellCenter, styles.premiumCell]}>
                <Text style={styles.premiumText}>{f.premium}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={styles.plans}>
          {/* Annual — highlighted */}
          <Pressable
            style={[styles.plan, selected === 'annual' && styles.planSelected]}
            onPress={() => setSelected('annual')}
          >
            <View style={styles.planBadgeRow}>
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>{T.paywall_popular_badge}</Text>
              </View>
            </View>
            <Text style={styles.planPeriod}>{T.paywall_plan_annual}</Text>
            <Text style={styles.planPrice}>{annualPrice}</Text>
            <Text style={styles.planSub}>{T.paywall_plan_annual_sub.replace('{monthly}', annualMonthly).replace('{pct}', String(annualSavings))}</Text>
          </Pressable>

          {/* Monthly */}
          <Pressable
            style={[styles.plan, selected === 'monthly' && styles.planSelected]}
            onPress={() => setSelected('monthly')}
          >
            <Text style={styles.planPeriod}>{T.paywall_plan_monthly}</Text>
            <Text style={styles.planPrice}>{monthlyPrice}</Text>
            <Text style={styles.planSub}>{T.paywall_plan_monthly_sub}</Text>
          </Pressable>
        </View>

        {/* Lifetime (I10): one payment, Premium for good, no subscription. */}
        <Pressable
          style={[styles.plan, styles.planLifetime, selected === 'lifetime' && styles.planSelected]}
          onPress={() => setSelected('lifetime')}
          testID="paywall-plan-lifetime"
        >
          <View>
            <Text style={styles.planPeriod}>{T.paywall_plan_lifetime}</Text>
            <Text style={styles.planSub}>{T.paywall_plan_lifetime_sub}</Text>
          </View>
          <Text style={styles.planPrice}>{lifetimePrice}</Text>
        </Pressable>

        {/* CTA: subscriptions are sold through the App Store / Play Store only. */}
        {Platform.OS === 'web' ? (
          <View style={styles.webNotice}>
            <Text style={styles.webNoticeText}>{T.paywall_web_only}</Text>
          </View>
        ) : (
        <Pressable
          style={[styles.cta, isLoading && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaText}>
              {selectedTrial
                ? T.paywall_trial_cta
                : selected === 'lifetime'
                  ? T.paywall_cta_lifetime.replace('{price}', lifetimePrice)
                  : T.paywall_cta_start.replace('{price}', selectedPrice)}
            </Text>
          )}
        </Pressable>
        )}

        {selectedTrial && Platform.OS !== 'web' && (
          // Exactly what happens and when, before the player commits.
          <Text style={styles.trialNote} testID="paywall-trial-terms">
            {T.paywall_trial_terms
              .replace('{price}', selected === 'annual' ? annualPrice : monthlyPrice)
              .replace('{period}', selected === 'annual' ? T.paywall_period_year : T.paywall_period_month)
              .replace('{date}', formatDate(trialStart, lang))
              .replace('{store}', STORE_NAME)}
          </Text>
        )}

        <Text style={styles.legal}>{selected === 'lifetime' ? T.paywall_legal_lifetime : T.paywall_legal}</Text>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => openLegalPage('terms', lang)} accessibilityRole="link">
            <Text style={styles.legalLink}>{T.legal_terms}</Text>
          </Pressable>
          <Text style={styles.legal}>·</Text>
          <Pressable onPress={() => openLegalPage('privacy', lang)} accessibilityRole="link">
            <Text style={styles.legalLink}>{T.legal_privacy}</Text>
          </Pressable>
        </View>

        {Platform.OS !== 'web' && (
          <Pressable onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>{T.paywall_restore}</Text>
          </Pressable>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const gold = '#FFD700';



import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useT } from '../src/lib/i18n';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import {
  subscriptionStore$,
  loadOfferings,
  purchaseSubscription,
  restorePurchases,
  PRODUCT_MONTHLY,
  PRODUCT_ANNUAL,
} from '../src/features/monetization/stores/subscription-store';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';


export default function PaywallScreen() {
  const T = useT();
  const { themeKey } = useTheme();

  const FEATURES = [
    { icon: '❄️', label: T.paywall_feat_freezes_label, free: T.paywall_feat_freezes_free, premium: T.paywall_feat_freezes_premium },
    { icon: '⚔️', label: T.paywall_feat_duels_label, free: T.paywall_feat_duels_free, premium: T.paywall_feat_duels_premium },
    { icon: '📊', label: T.paywall_feat_stats_label, free: T.paywall_feat_stats_free, premium: T.paywall_feat_stats_premium },
    { icon: '🛍️', label: T.paywall_feat_shop_label, free: T.paywall_feat_shop_free, premium: T.paywall_feat_shop_premium },
    { icon: '🚫', label: T.paywall_feat_ads_label, free: T.paywall_feat_ads_free, premium: T.paywall_feat_ads_premium },
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
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: colors.textMuted, fontSize: 14, fontWeight: 'bold' },
  badge: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: gold,
    letterSpacing: 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: gold + '66',
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },

  scroll: { padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl },

  hero: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  heroEmoji: { fontSize: 56 },
  heroTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 28,
  },
  heroSub: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Feature table
  table: {
    backgroundColor: colors.surface,
    borderRadius: 4,
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
    fontSize: 9,
    fontWeight: 'bold',
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
  featureLabel: { fontSize: fontSizes.xs, color: colors.text, fontWeight: 'bold', flex: 1 },
  freeText: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },
  premiumText: { fontSize: 9, color: gold, fontWeight: 'bold', textAlign: 'center' },

  // Plans
  plans: { flexDirection: 'row', gap: spacing.sm },
  plan: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  planSelected: { borderColor: gold, backgroundColor: gold + '11' },
  planBadgeRow: { height: 20, justifyContent: 'center' },
  popularBadge: {
    backgroundColor: gold,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  popularBadgeText: { fontSize: 8, fontWeight: 'bold', color: '#000', letterSpacing: 1 },
  planPeriod: { fontSize: fontSizes.sm, fontWeight: 'bold', color: colors.text, letterSpacing: 1 },
  planPrice: { fontSize: fontSizes.xl, fontWeight: 'bold', color: gold },
  planSub: { fontSize: 9, color: colors.textMuted, textAlign: 'center' },

  // CTA
  cta: {
    backgroundColor: gold,
    borderRadius: 4,
    borderWidth: 3,
    borderColor: '#B8860B',
    borderBottomWidth: 5,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 1,
  },

  legal: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 14,
  },
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
  const isPremium = use$(subscriptionStore$.isPremium);
  const [selected, setSelected] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    loadOfferings();
  }, []);

  useEffect(() => {
    if (isPremium) {
      router.back();
    }
  }, [isPremium]);

  const monthlyPkg = offering?.availablePackages.find(
    (p: any) => p.product.identifier === PRODUCT_MONTHLY,
  );
  const annualPkg = offering?.availablePackages.find(
    (p: any) => p.product.identifier === PRODUCT_ANNUAL,
  );

  // Fallback prices shown before offerings load
  const monthlyPrice = monthlyPkg?.product.priceString ?? '4,99 €';
  const annualPrice = annualPkg?.product.priceString ?? '34,99 €';
  const annualMonthly = annualPkg
    ? `${(annualPkg.product.price / 12).toFixed(2)} €/mois`
    : '2,92 €/mois';

  async function handlePurchase() {
    const productId = selected === 'monthly' ? PRODUCT_MONTHLY : PRODUCT_ANNUAL;
    const success = await purchaseSubscription(productId);
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
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.badge}>{T.paywall_badge}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>👑</Text>
          <Text style={styles.heroTitle}>{T.paywall_hero_title}</Text>
          <Text style={styles.heroSub}>{T.paywall_hero_sub}</Text>
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
            <Text style={styles.planSub}>{T.paywall_plan_annual_sub.replace('{monthly}', annualMonthly)}</Text>
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

        {/* CTA */}
        <Pressable
          style={[styles.cta, isLoading && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.ctaText}>
              {T.paywall_cta_start.replace('{price}', selected === 'annual' ? annualPrice : monthlyPrice)}
            </Text>
          )}
        </Pressable>

        <Text style={styles.legal}>{T.paywall_legal}</Text>

        <Pressable onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>{T.paywall_restore}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const gold = '#FFD700';
const premiumPurple = '#9B59B6';



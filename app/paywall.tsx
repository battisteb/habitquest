import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
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

const FEATURES = [
  { icon: '❄️', label: 'Streak Freezes', free: '1 stored · plein tarif', premium: '3 stored · prix /2' },
  { icon: '⚔️', label: 'Duels PvP', free: '3×/semaine max', premium: '1×/jour max' },
  { icon: '📊', label: 'Statistiques', free: 'Dernier mois', premium: 'Historique complet' },
  { icon: '🛍️', label: 'Boutique', free: 'Catalogue de base', premium: 'Catalogue complet + exclusifs' },
  { icon: '🚫', label: 'Publicités', free: 'Oui', premium: 'Non' },
  { icon: '⚡', label: 'Support', free: 'Standard', premium: 'Prioritaire' },
];

export default function PaywallScreen() {
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
    (p) => p.product.identifier === PRODUCT_MONTHLY,
  );
  const annualPkg = offering?.availablePackages.find(
    (p) => p.product.identifier === PRODUCT_ANNUAL,
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
        '🎉 Bienvenue en Premium !',
        'Toutes les fonctionnalités sont maintenant débloquées.',
        [{ text: 'Super !', onPress: () => router.back() }],
      );
    }
  }

  async function handleRestore() {
    const success = await restorePurchases();
    if (success) {
      Alert.alert('Achats restaurés', 'Ton abonnement Premium est actif.');
    } else {
      Alert.alert('Aucun achat trouvé', 'Aucun abonnement actif associé à ce compte.');
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
        <Text style={styles.badge}>⚡ PREMIUM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>👑</Text>
          <Text style={styles.heroTitle}>Passe ton aventure{'\n'}au niveau supérieur</Text>
          <Text style={styles.heroSub}>
            Rejoins les héros qui n'ont aucune limite
          </Text>
        </View>

        {/* Feature comparison */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableCol, { flex: 2 }]}>Feature</Text>
            <Text style={[styles.tableCol, styles.tableColCenter]}>Gratuit</Text>
            <Text style={[styles.tableCol, styles.tableColCenter, styles.premiumCol]}>
              Premium
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
                <Text style={styles.popularBadgeText}>⭐ POPULAIRE</Text>
              </View>
            </View>
            <Text style={styles.planPeriod}>Annuel</Text>
            <Text style={styles.planPrice}>{annualPrice}</Text>
            <Text style={styles.planSub}>soit {annualMonthly} · économise 42%</Text>
          </Pressable>

          {/* Monthly */}
          <Pressable
            style={[styles.plan, selected === 'monthly' && styles.planSelected]}
            onPress={() => setSelected('monthly')}
          >
            <Text style={styles.planPeriod}>Mensuel</Text>
            <Text style={styles.planPrice}>{monthlyPrice}</Text>
            <Text style={styles.planSub}>par mois · sans engagement</Text>
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
              Commencer · {selected === 'annual' ? annualPrice + '/an' : monthlyPrice + '/mois'}
            </Text>
          )}
        </Pressable>

        <Text style={styles.legal}>
          Renouvellement automatique. Annulable à tout moment depuis les réglages de ton
          compte {'\n'}Apple ID / Google Play. Prix TTC.
        </Text>

        <Pressable onPress={handleRestore} style={styles.restoreBtn}>
          <Text style={styles.restoreText}>Restaurer les achats</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const gold = '#FFD700';
const premiumPurple = '#9B59B6';

const styles = StyleSheet.create({
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
});

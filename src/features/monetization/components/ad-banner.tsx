import { View, StyleSheet, Pressable, Text } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { use$ } from '@legendapp/state/react';
import { subscriptionStore$ } from '../stores/subscription-store';
import { ADMOB_IDS } from '../utils/ad-service';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useRouter } from 'expo-router';

interface AdBannerProps {
  /** Where the banner sits — determines border styling */
  position?: 'bottom' | 'inline';
}

/**
 * Shows an AdMob banner for free users.
 * Renders nothing for premium users.
 * Includes a subtle "GO PREMIUM" dismiss hint.
 */
export function AdBanner({ position = 'bottom' }: AdBannerProps) {
  const isPremium = use$(subscriptionStore$.isPremium);
  const router = useRouter();

  if (isPremium) return null;

  return (
    <View style={[styles.container, position === 'bottom' && styles.bottomContainer]}>
      <BannerAd
        unitId={ADMOB_IDS.banner}
        size={BannerAdSize.BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdFailedToLoad={() => {/* Silent fail */}}
      />
      <Pressable style={styles.premiumHint} onPress={() => router.push('/paywall')}>
        <Text style={styles.premiumHintText}>✕ SUPPRIMER LES PUBS</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomContainer: {
    // Safe area handled by parent screens
  },
  premiumHint: {
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
  },
  premiumHintText: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 1,
    fontWeight: 'bold',
  },
});

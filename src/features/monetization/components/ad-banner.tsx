import { View, StyleSheet, Pressable, Text, Platform } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { subscriptionStore$ } from '../stores/subscription-store';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useRouter } from 'expo-router';

// AdMob is native-only — dynamic import to avoid web crashes
const isNative = Platform.OS !== 'web';
let BannerAd: any = null;
let BannerAdSize: any = { BANNER: 'BANNER' };
let ADMOB_BANNER_ID = '';
if (isNative) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  ADMOB_BANNER_ID = require('../utils/ad-service').ADMOB_IDS.banner;
}

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
  if (!isNative || !BannerAd) return null; // No ads on web

  return (
    <View style={[styles.container, position === 'bottom' && styles.bottomContainer]}>
      <BannerAd
        unitId={ADMOB_BANNER_ID}
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

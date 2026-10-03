import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { subscriptionStore$ } from '../stores/subscription-store';
import { trialDaysLeft } from '../utils/trial-offer';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';

/** During the free trial: days left, tap to see when it ends and how to cancel. */
export function TrialBanner() {
  const T = useT();
  const router = useRouter();
  const trialEndsAt = use$(subscriptionStore$.trialEndsAt);
  const days = trialDaysLeft(trialEndsAt);
  if (days === null) return null;

  return (
    <Pressable style={styles.banner} onPress={() => router.push('/paywall')} testID="trial-banner" accessibilityRole="button">
      <Text style={styles.text}>{days === 0 ? T.trial_banner_last : T.trial_banner.replace('{n}', String(days))}</Text>
      <Text style={styles.arrow}>▶</Text>
    </Pressable>
  );
}

const gold = '#FFD700';

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: gold + '88',
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: 0,
    marginBottom: spacing.sm,
  },
  text: { color: gold, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), flex: 1 },
  arrow: { color: gold, fontSize: pixelSize(10), fontFamily: fonts.bold },
});

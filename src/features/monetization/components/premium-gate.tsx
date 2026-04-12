import { View, Text, StyleSheet, Pressable } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { subscriptionStore$ } from '../stores/subscription-store';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';

interface PremiumGateProps {
  /** Content to show when user IS premium */
  children: React.ReactNode;
  /** Short description of what's locked */
  lockedLabel: string;
  /** Optional icon */
  lockedIcon?: string;
}

/**
 * Wraps a feature that requires Premium.
 * Shows a lock overlay + CTA when free.
 */
export function PremiumGate({ children, lockedLabel, lockedIcon = '👑' }: PremiumGateProps) {
  const isPremium = use$(subscriptionStore$.isPremium);
  const router = useRouter();

  if (isPremium) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <Text style={styles.icon}>{lockedIcon}</Text>
        <Text style={styles.label}>{lockedLabel}</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/paywall')}>
          <Text style={styles.ctaText}>Passer Premium</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Inline pill showing "PREMIUM" badge on locked items (e.g. shop items).
 */
export function PremiumBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>👑 PREMIUM</Text>
    </View>
  );
}

const gold = '#FFD700';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 4,
  },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: colors.background + 'CC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    zIndex: 10,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: gold + '55',
  },
  icon: { fontSize: 32 },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: gold,
    letterSpacing: 1,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  cta: {
    backgroundColor: gold,
    borderRadius: 4,
    borderBottomWidth: 3,
    borderColor: '#B8860B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ctaText: { fontSize: fontSizes.xs, fontWeight: 'bold', color: '#000', letterSpacing: 1 },

  badge: {
    backgroundColor: gold + '22',
    borderWidth: 1,
    borderColor: gold + '88',
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 8, fontWeight: 'bold', color: gold, letterSpacing: 0.5 },
});

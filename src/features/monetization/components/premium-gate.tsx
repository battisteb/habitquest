import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { subscriptionStore$ } from '../stores/subscription-store';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';

interface PremiumGateProps {
  children: React.ReactNode;
  lockedLabel: string;
  lockedIcon?: string;
}

function createStyles() {
  const gold = '#FFD700';
  return StyleSheet.create({
    container: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: 0,
    },
    overlay: {
      position: 'absolute',
      inset: 0,
      backgroundColor: colors.background + 'CC',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      zIndex: 10,
      borderRadius: 0,
      borderWidth: 2,
      borderColor: gold + '55',
    },
    icon: { fontSize: 32 },
    label: {
      fontSize: pixelSize(fontSizes.sm),
      fontFamily: fonts.bold,
      color: gold,
      letterSpacing: 1,
      textAlign: 'center',
      paddingHorizontal: spacing.md,
    },
    cta: {
      backgroundColor: gold,
      borderRadius: 0,
      borderBottomWidth: 3,
      borderColor: '#B8860B',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },
    ctaText: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: '#000', letterSpacing: 1 },
    badge: {
      backgroundColor: gold + '22',
      borderWidth: 1,
      borderColor: gold + '88',
      borderRadius: 0,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    badgeText: { fontSize: pixelSize(8), fontFamily: fonts.bold, color: gold, letterSpacing: 0.5 },
  });
}

export function PremiumGate({ children, lockedLabel, lockedIcon = '👑' }: PremiumGateProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const isPremium = use$(subscriptionStore$.isPremium);
  const router = useRouter();

  if (isPremium) return <>{children}</>;

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <Text style={styles.icon}>{lockedIcon}</Text>
        <Text style={styles.label}>{lockedLabel}</Text>
        <Pressable style={styles.cta} onPress={() => router.push('/paywall')}>
          <Text style={styles.ctaText}>{T.premium_go}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PremiumBadge() {
  const styles = createStyles();
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>👑 PREMIUM</Text>
    </View>
  );
}

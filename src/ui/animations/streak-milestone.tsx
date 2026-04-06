import React, { useEffect } from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { colors, fontSizes, spacing } from '../theme/tokens';

interface StreakMilestoneProps {
  streak: number;
  visible: boolean;
  onDismiss: () => void;
}

const MILESTONE_LABELS: Record<number, string> = {
  7: '🔥 WEEK WARRIOR',
  14: '⚡ FORTNIGHT FIGHTER',
  30: '💎 MONTHLY MASTER',
  60: '🏆 STREAK LEGEND',
  100: '👑 CENTURY HERO',
};

export function StreakMilestone({ streak, visible, onDismiss }: StreakMilestoneProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 12, stiffness: 180 });
    } else {
      scale.value = withTiming(0, { duration: 150 });
      opacity.value = withDelay(100, withTiming(0, { duration: 150 }));
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (!visible) return null;

  const label = MILESTONE_LABELS[streak] ?? `🔥 ${streak}-DAY STREAK!`;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.overlay, overlayStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
      <Animated.View style={[styles.card, cardStyle]}>
        <Text style={styles.emoji}>🔥</Text>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.streak}>{streak} DAYS</Text>
        <Text style={styles.sub}>Your streak is legendary. Keep it alive!</Text>
        <Pressable style={styles.btn} onPress={onDismiss}>
          <Text style={styles.btnText}>CLAIM GLORY ▶</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.streak,
    borderRadius: 8,
    borderBottomWidth: 6,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
  },
  emoji: { fontSize: 64 },
  label: {
    color: colors.streak,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    letterSpacing: 2,
    textAlign: 'center',
  },
  streak: {
    color: colors.text,
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  sub: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: spacing.sm,
    backgroundColor: colors.streak,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 4,
    borderBottomWidth: 3,
    borderColor: colors.streak + 'aa',
  },
  btnText: {
    color: colors.background,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fontSizes, spacing } from '../theme/tokens';

interface StreakMilestoneOverlayProps {
  visible: boolean;
  streakCount: number;
  habitName: string;
  onComplete?: () => void;
}

const MILESTONE_CONFIGS: Record<number, { emoji: string; label: string; color: string }> = {
  7:   { emoji: '🔥', label: '1 WEEK',    color: '#f39c12' },
  14:  { emoji: '⚡', label: '2 WEEKS',   color: '#e67e22' },
  30:  { emoji: '💎', label: '1 MONTH',   color: '#5b8def' },
  60:  { emoji: '🏆', label: '2 MONTHS',  color: '#9b59b6' },
  100: { emoji: '👑', label: '100 DAYS',  color: '#e74c3c' },
  365: { emoji: '🌟', label: '1 YEAR',    color: '#f1c40f' },
};

function getMilestoneConfig(count: number) {
  return MILESTONE_CONFIGS[count] ?? { emoji: '🔥', label: `${count} DAYS`, color: colors.accent };
}

export function StreakMilestoneOverlay({ visible, streakCount, habitName, onComplete }: StreakMilestoneOverlayProps) {
  const overlayOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const badgeRotate = useSharedValue(-10);
  const flameOpacity = useSharedValue(0);
  const flameY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = 0;
      badgeScale.value = 0;
      badgeRotate.value = -10;
      flameOpacity.value = 0;
      flameY.value = 20;

      overlayOpacity.value = withTiming(1, { duration: 250 });

      badgeScale.value = withDelay(
        150,
        withSequence(
          withSpring(1.25, { damping: 6, stiffness: 200 }),
          withSpring(1, { damping: 10, stiffness: 150 }),
        ),
      );
      badgeRotate.value = withDelay(
        150,
        withSequence(
          withSpring(8, { damping: 6 }),
          withSpring(0, { damping: 8 }),
        ),
      );

      flameOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      flameY.value = withDelay(400, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));

      overlayOpacity.value = withDelay(
        2800,
        withTiming(0, { duration: 350 }, (finished) => {
          if (finished && onComplete) runOnJS(onComplete)();
        }),
      );
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { rotate: `${badgeRotate.value}deg` },
    ],
  }));
  const flameStyle = useAnimatedStyle(() => ({
    opacity: flameOpacity.value,
    transform: [{ translateY: flameY.value }],
  }));

  if (!visible) return null;

  const config = getMilestoneConfig(streakCount);

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.card, badgeStyle, { borderColor: config.color }]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
        <Text style={[styles.milestoneLabel, { color: config.color }]}>{config.label} STREAK!</Text>
        <View style={[styles.countBadge, { backgroundColor: config.color }]}>
          <Text style={styles.countText}>{streakCount}</Text>
        </View>
        <Animated.View style={flameStyle}>
          <Text style={styles.habitName} numberOfLines={1}>{habitName}</Text>
          <Text style={styles.subtitle}>Incredible consistency!</Text>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
    pointerEvents: 'none',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderRadius: 8,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 240,
    ...Platform.select({
      native: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 12,
      },
      web: { boxShadow: '0 8px 16px rgba(0,0,0,0.5)' },
    }),
  },
  emoji: {
    fontSize: 56,
  },
  milestoneLabel: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    letterSpacing: 3,
    textAlign: 'center',
  },
  countBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  countText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.background,
  },
  habitName: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: 'bold',
    textAlign: 'center',
    maxWidth: 200,
  },
  subtitle: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
});

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fontSizes, spacing } from '../theme/tokens';

interface LevelUpOverlayProps {
  visible: boolean;
  newLevel: number;
  onComplete?: () => void;
}

export function LevelUpOverlay({ visible, newLevel, onComplete }: LevelUpOverlayProps) {
  const overlayOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const badgeY = useSharedValue(30);
  const starOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = 0;
      badgeScale.value = 0;
      badgeY.value = 30;
      starOpacity.value = 0;

      // Fade in overlay
      overlayOpacity.value = withTiming(1, { duration: 200 });

      // Badge entrance
      badgeScale.value = withDelay(
        100,
        withSequence(
          withTiming(1.3, { duration: 300, easing: Easing.out(Easing.back(3)) }),
          withTiming(1, { duration: 200 }),
        ),
      );
      badgeY.value = withDelay(
        100,
        withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }),
      );

      // Stars appear
      starOpacity.value = withDelay(300, withTiming(1, { duration: 200 }));

      // Auto-dismiss after 2.5s
      overlayOpacity.value = withDelay(
        2200,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished && onComplete) {
            runOnJS(onComplete)();
          }
        }),
      );
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: badgeScale.value },
      { translateY: badgeY.value },
    ],
  }));

  const starsStyle = useAnimatedStyle(() => ({
    opacity: starOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <Animated.View style={[styles.badge, badgeStyle]}>
        <Animated.View style={[styles.starsRow, starsStyle]}>
          <Text style={styles.star}>★</Text>
          <Text style={styles.star}>★</Text>
          <Text style={styles.star}>★</Text>
        </Animated.View>
        <Text style={styles.levelUpText}>LEVEL UP!</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelNumber}>{newLevel}</Text>
        </View>
        <Text style={styles.subtitle}>Keep going, adventurer!</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  badge: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  star: {
    fontSize: 32,
    color: colors.accent,
  },
  levelUpText: {
    fontSize: fontSizes.xxl + 4,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 4,
    textShadowColor: 'rgba(218, 165, 32, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  levelBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accent,
    borderWidth: 4,
    borderColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.background,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: spacing.xs,
  },
});

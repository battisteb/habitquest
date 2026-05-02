import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { colors, fontSizes, spacing } from '../theme/tokens';

interface AllDoneCelebrationProps {
  visible: boolean;
}

export function AllDoneCelebration({ visible }: AllDoneCelebrationProps) {
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      opacity.value = withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(2500, withTiming(0, { duration: 500 })),
      );
    } else {
      translateY.value = -60;
      opacity.value = 0;
    }
  }, [visible]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, style]}>
      <Text style={styles.text}>🏆 ALL QUESTS COMPLETE!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 80,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.accent + 'aa',
    borderBottomWidth: 4,
    padding: spacing.md,
    alignItems: 'center',
    zIndex: 998,
    pointerEvents: 'none',
  },
  text: {
    color: colors.background,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

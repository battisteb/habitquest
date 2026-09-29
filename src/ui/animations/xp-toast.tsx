import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fontSizes, fonts, pixelSize } from '../theme/tokens';

interface XpToastProps {
  visible: boolean;
  xpAmount: number;
  goldAmount?: number;
  onComplete?: () => void;
}

export function XpToast({ visible, xpAmount, goldAmount = 0, onComplete }: XpToastProps) {
  const translateY = useSharedValue(20);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = 20;
      opacity.value = 0;

      // Slide up and fade in, hold, then drift up and fade out (one sequence
      // per shared value: a second assignment would cancel the first).
      translateY.value = withSequence(
        withTiming(-10, { duration: 400, easing: Easing.out(Easing.cubic) }),
        withDelay(600, withTiming(-40, { duration: 400 })),
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(
          800,
          withTiming(0, { duration: 400 }, (finished) => {
            if (finished && onComplete) {
              runOnJS(onComplete)();
            }
          }),
        ),
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  const text = goldAmount > 0
    ? `+${xpAmount} XP  +${goldAmount} G`
    : `+${xpAmount} XP`;

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="none">
      <Animated.Text style={styles.text}>{text}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.xp,
    zIndex: 50,
  },
  text: {
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.xp,
    letterSpacing: 2,
  },
});

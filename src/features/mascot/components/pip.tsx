import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { strips } from '../../companion/components/companion';
import { PIP_DEFAULT_MOOD, PIP_GRID, PIP_MOODS, pipSprite, type PipExpression, type PipMood } from '../sprites';

interface PipProps {
  expression?: PipExpression;
  /** Colour of its mood; by default the one that goes with the expression. */
  mood?: PipMood;
  size?: number;
  /** Squash-and-stretch idle bounce (off for reduced motion or tests). */
  bouncing?: boolean;
  accessibilityLabel?: string;
}

/** Pip, the slime mascot: soft, bouncy, coloured by its mood. */
export function Pip({ expression = 'happy', mood, size = 64, bouncing = true, accessibilityLabel }: PipProps) {
  const palette = PIP_MOODS[mood ?? PIP_DEFAULT_MOOD[expression]];
  const parts = useMemo(() => strips(pipSprite(expression), palette), [expression, palette]);
  const cell = size / PIP_GRID;

  const squash = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!bouncing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(squash, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(squash, { toValue: -1, duration: 320, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(squash, { toValue: 0, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(700),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bouncing, squash]);

  // 1 = squashed (wide and low), -1 = stretched (thin and up).
  const scaleX = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [0.94, 1, 1.08] });
  const scaleY = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [1.08, 1, 0.9] });
  const lift = squash.interpolate({ inputRange: [-1, 0, 1], outputRange: [-cell * 1.5, 0, 0] });

  return (
    <View style={{ width: size, height: size }} accessibilityRole="image" accessibilityLabel={accessibilityLabel} testID="pip">
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transformOrigin: 'bottom', transform: [{ translateY: lift }, { scaleX }, { scaleY }] },
        ]}
      >
        {parts.map(([x, y, w, color], i) => (
          <View
            key={i}
            style={{ position: 'absolute', left: x * cell, top: y * cell, width: w * cell + 0.5, height: cell + 0.5, backgroundColor: color }}
          />
        ))}
      </Animated.View>
    </View>
  );
}

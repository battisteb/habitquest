import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, withSpring,
} from 'react-native-reanimated';

interface Particle {
  angle: number;
  color: string;
}

const PARTICLES: Particle[] = [
  { angle: 0,   color: '#FFD700' },
  { angle: 45,  color: '#FF6B35' },
  { angle: 90,  color: '#6C63FF' },
  { angle: 135, color: '#4CAF50' },
  { angle: 180, color: '#FFD700' },
  { angle: 225, color: '#FF6B35' },
  { angle: 270, color: '#6C63FF' },
  { angle: 315, color: '#4CAF50' },
];

function ParticleDot({ angle, color, visible }: Particle & { visible: boolean }) {
  const distance = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      distance.value = withSpring(60, { damping: 12, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 100 });
      // Fade out after burst
      opacity.value = withDelay(300, withTiming(0, { duration: 300 }));
    } else {
      distance.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const rad = (angle * Math.PI) / 180;
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: Math.cos(rad) * distance.value },
      { translateY: Math.sin(rad) * distance.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animStyle,
      ]}
    />
  );
}

interface CompletionBurstProps {
  visible: boolean;
}

export function CompletionBurst({ visible }: CompletionBurstProps) {
  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((p, i) => (
        <ParticleDot key={i} {...p} visible={visible} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

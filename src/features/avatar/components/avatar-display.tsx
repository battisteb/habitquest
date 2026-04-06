import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { getAvatarStage } from '../utils/avatar-evolution';

interface AvatarDisplayProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = { sm: 48, md: 80, lg: 120 } as const;
const FONT_SIZES = { sm: 24, md: 40, lg: 64 } as const;

export function AvatarDisplay({ level, size = 'md' }: AvatarDisplayProps) {
  const stage = getAvatarStage(level);
  const dim = SIZES[size];
  const fontSize = FONT_SIZES[size];
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 1800 }), -1, true);
  }, [pulse]);

  const auraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowColor: stage.aura,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  }));

  return (
    <View style={[styles.container, { width: dim, height: dim }]}>
      <Animated.View
        style={[
          styles.auraRing,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            borderColor: stage.aura,
            backgroundColor: stage.aura + '22',
          },
          auraStyle,
        ]}
      />
      <Text style={[styles.emoji, { fontSize }]}>{stage.emoji}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  auraRing: {
    position: 'absolute',
    borderWidth: 3,
  },
  emoji: {
    textAlign: 'center',
  },
});

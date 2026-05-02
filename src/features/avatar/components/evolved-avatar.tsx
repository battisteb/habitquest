import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { PixelAvatar, type PixelAvatarProps } from '../renderer/pixel-avatar';
import { getAvatarStage } from '../utils/avatar-evolution';

interface EvolvedAvatarProps extends PixelAvatarProps {
  level: number;
  showAura?: boolean;
}

const PARTICLE_COUNT_CHAMPION = 4;
const PARTICLE_COUNT_LEGEND = 6;

export function EvolvedAvatar({
  level,
  showAura = true,
  size = 200,
  ...avatarProps
}: EvolvedAvatarProps) {
  const stage = getAvatarStage(level);
  const auraColor = stage.aura;

  const hasAura = showAura && level >= 5;
  const hasGlow = showAura && level >= 10;
  const hasPulse = showAura && level >= 15;
  const hasParticles = showAura && level >= 20;
  const isLegend = showAura && level >= 30;
  const particleCount = isLegend ? PARTICLE_COUNT_LEGEND : PARTICLE_COUNT_CHAMPION;

  const padding = hasAura ? 12 : 0;
  const containerSize = size + padding * 2;

  const pulse = useSharedValue(1);
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (hasPulse) {
      const duration = isLegend ? 1400 : 2000;
      pulse.value = withRepeat(
        withTiming(1.04, { duration, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    }
    if (hasParticles) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 6000, easing: Easing.linear }),
        -1,
        false,
      );
    }
  }, [hasPulse, hasParticles, isLegend, pulse, rotation]);

  const auraAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hasPulse ? pulse.value : 1 }],
  }));

  const particlesContainerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View
      style={[styles.container, { width: containerSize, height: containerSize }]}
      testID="evolved-avatar-root"
    >
      {hasAura && (
        <Animated.View
          testID="evolved-avatar-aura"
          accessibilityLabel={`aura-${auraColor}`}
          style={[
            styles.aura,
            {
              width: containerSize,
              height: containerSize,
              borderRadius: containerSize / 2,
              borderColor: auraColor,
              borderWidth: 2,
              backgroundColor: hasGlow ? auraColor + '22' : 'transparent',
            },
            Platform.select({
              native: {
                shadowColor: auraColor,
                shadowOpacity: hasGlow ? 0.7 : 0,
                shadowRadius: hasGlow ? 14 : 0,
                shadowOffset: { width: 0, height: 0 },
                elevation: hasGlow ? 10 : 0,
              },
              web: hasGlow ? { boxShadow: `0 0 14px ${auraColor}` } : undefined,
            }),
            auraAnimatedStyle,
          ]}
        />
      )}

      {hasParticles && (
        <Animated.View
          style={[
            styles.particlesContainer,
            { width: containerSize, height: containerSize },
            particlesContainerStyle,
          ]}
        >
          {Array.from({ length: particleCount }).map((_, i) => {
            const angle = (i / particleCount) * 2 * Math.PI;
            const radius = containerSize / 2 - 2;
            const x = Math.cos(angle) * radius + containerSize / 2 - 2;
            const y = Math.sin(angle) * radius + containerSize / 2 - 2;
            return (
              <View
                key={i}
                testID={`evolved-avatar-particle-${i}`}
                style={[
                  styles.particle,
                  {
                    left: x,
                    top: y,
                    backgroundColor: auraColor,
                  },
                  Platform.OS !== 'web' ? { shadowColor: auraColor } : { boxShadow: `0 0 4px ${auraColor}` },
                ]}
              />
            );
          })}
        </Animated.View>
      )}

      <View style={[styles.avatarLayer, { padding }]}>
        <PixelAvatar size={size} {...avatarProps} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
  },
  avatarLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  particlesContainer: {
    position: 'absolute',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    ...Platform.select({
      native: { shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
      web: {},
    }),
  },
});

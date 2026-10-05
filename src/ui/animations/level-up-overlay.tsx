import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  cancelAnimation,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../theme/tokens';
import { useT } from '../../lib/i18n';
import { getRankForLevel } from '../../lib/constants/game-config';
import { PixelAvatar } from '../../features/avatar/renderer/pixel-avatar';
import { avatarConfigStore$ } from '../../features/avatar/stores/avatar-config-store';
import { shopStore$ } from '../../features/shop/stores/shop-store';

interface LevelUpOverlayProps {
  visible: boolean;
  newLevel: number;
  onComplete?: () => void;
}

const HERO = 120;
const RAYS = 12;
const RAY_LEN = 150;

// Confetti colours taken from the theme palette (gold, red, green, violet, orange, purple).
const CONFETTI_COLORS = [
  colors.accent,
  colors.primary,
  colors.success,
  colors.xp,
  colors.streak,
  colors.secondary,
];

// Deterministic confetti layout, so the burst looks the same each time and tests stay stable.
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  x: ((i * 53) % 100) / 100, // 0..1 across the width
  delay: (i % 6) * 55,
  dur: 1200 + (i % 5) * 180,
  size: pixelSize(8) + (i % 3) * 4,
  sway: (i % 2 ? 1 : -1) * (18 + (i % 4) * 10),
  spin: (i % 2 ? 1 : -1) * (360 + (i % 3) * 180),
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
}));

/** One falling pixel square. Restarts whenever the celebration opens. */
function Confetti({ piece, play }: { piece: (typeof CONFETTI)[number]; play: boolean }) {
  const p = useSharedValue(0);

  useEffect(() => {
    if (play) {
      p.value = 0;
      p.value = withDelay(
        piece.delay,
        withTiming(1, { duration: piece.dur, easing: Easing.in(Easing.quad) }),
      );
    } else {
      cancelAnimation(p);
      p.value = 0;
    }
  }, [play]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : p.value < 0.85 ? 1 : (1 - p.value) / 0.15,
    transform: [
      { translateY: -40 + p.value * 760 },
      { translateX: Math.sin(p.value * Math.PI * 2) * piece.sway },
      { rotate: `${p.value * piece.spin}deg` },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.confetti,
        { left: `${piece.x * 100}%`, width: piece.size, height: piece.size, backgroundColor: piece.color },
        style,
      ]}
    />
  );
}

/**
 * Level-up celebration, "Hero Leap" style (chosen by Battiste): the player's own
 * hero crouches then leaps up inside a slow sunburst of pixel rays, pixel confetti
 * rains down, "LEVEL UP!" bounces in, the new level pops in a badge and, on a rank
 * change, the new rank unfurls in its colour. Auto-closes after a few seconds.
 */
export function LevelUpOverlay({ visible, newLevel, onComplete }: LevelUpOverlayProps) {
  const T = useT();
  const look = use$(avatarConfigStore$);
  const equippedSlots = use$(shopStore$.equippedSlots);

  const rank = getRankForLevel(newLevel);
  const isNewRank = newLevel > 1 && rank.minLevel === newLevel;

  const overlayOpacity = useSharedValue(0);
  const heroY = useSharedValue(0);
  const heroScaleY = useSharedValue(1);
  const raysRotate = useSharedValue(0);
  const raysOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const rankScale = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(raysRotate);
      overlayOpacity.value = 0;
      heroY.value = 0;
      heroScaleY.value = 1;
      raysRotate.value = 0;
      raysOpacity.value = 0;
      titleScale.value = 0;
      badgeScale.value = 0;
      rankScale.value = 0;
      subtitleOpacity.value = 0;
      return;
    }

    // Backdrop: fade in, hold, fade out, then report done.
    overlayOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(
        2400,
        withTiming(0, { duration: 300 }, (finished) => {
          if (finished && onComplete) runOnJS(onComplete)();
        }),
      ),
    );

    // Sunburst keeps turning behind the hero.
    raysOpacity.value = withDelay(120, withTiming(1, { duration: 300 }));
    raysRotate.value = withRepeat(withTiming(360, { duration: 7000, easing: Easing.linear }), -1);

    // Hero: crouch, leap, land with a bounce, then a small second hop.
    heroScaleY.value = withDelay(
      120,
      withSequence(
        withTiming(0.82, { duration: 120 }),
        withTiming(1.06, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 140 }),
      ),
    );
    heroY.value = withDelay(
      180,
      withSequence(
        withTiming(-110, { duration: 340, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 300, easing: Easing.bounce }),
        withTiming(-45, { duration: 200, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 180, easing: Easing.bounce }),
      ),
    );

    // Text and badge bounce in once the hero is in the air.
    titleScale.value = withDelay(620, withTiming(1, { duration: 400, easing: Easing.out(Easing.back(2.2)) }));
    badgeScale.value = withDelay(1120, withTiming(1, { duration: 380, easing: Easing.out(Easing.back(2.6)) }));
    rankScale.value = isNewRank
      ? withDelay(1480, withTiming(1, { duration: 420, easing: Easing.out(Easing.back(2.2)) }))
      : 0;
    subtitleOpacity.value = withDelay(1520, withTiming(1, { duration: 300 }));

    return () => cancelAnimation(raysRotate);
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: overlayOpacity.value }));
  const raysStyle = useAnimatedStyle(() => ({
    opacity: raysOpacity.value * 0.5,
    transform: [{ rotate: `${raysRotate.value}deg` }],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: heroY.value }, { scaleY: heroScaleY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleScale.value, transform: [{ scale: titleScale.value }] }));
  const badgeStyle = useAnimatedStyle(() => ({ opacity: badgeScale.value, transform: [{ scale: badgeScale.value }] }));
  const rankStyle = useAnimatedStyle(() => ({ opacity: rankScale.value, transform: [{ scale: rankScale.value }] }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none" testID="level-up-overlay">
      {CONFETTI.map((piece, i) => (
        <Confetti key={i} piece={piece} play={visible} />
      ))}

      <View style={styles.content}>
        <View style={styles.heroZone}>
          <Animated.View style={[styles.raysWrap, raysStyle]} pointerEvents="none">
            {Array.from({ length: RAYS }).map((_, i) => (
              <View
                key={i}
                style={[StyleSheet.absoluteFill, styles.rayArm, { transform: [{ rotate: `${(360 / RAYS) * i}deg` }] }]}
              >
                <View style={[styles.ray, { opacity: i % 2 ? 0.5 : 0.85 }]} />
              </View>
            ))}
          </Animated.View>

          <Animated.View style={heroStyle}>
            <PixelAvatar
              size={HERO}
              skinColor={look.skinColor}
              hairColor={look.hairColor}
              eyeColor={look.eyeColor}
              hat={equippedSlots?.hat?.item?.sprite_key}
              outfit={equippedSlots?.outfit?.item?.sprite_key}
              accessory={equippedSlots?.accessory?.item?.sprite_key}
            />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.title, titleStyle]} testID="level-up-title">
          {T.level_up_title}
        </Animated.Text>

        <Animated.View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeNumber} testID="level-up-number">
            {newLevel}
          </Text>
        </Animated.View>

        {isNewRank ? (
          <Animated.View style={[styles.rankPlate, rankStyle, { borderColor: rank.color }]}>
            <Text style={[styles.rankText, { color: rank.color }]}>{rank.name}</Text>
          </Animated.View>
        ) : null}

        <Animated.Text style={[styles.subtitle, subtitleStyle]}>{T.level_up_subtitle}</Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    top: 0,
  },
  content: {
    alignItems: 'center',
    gap: spacing.md,
    width: '100%',
    paddingHorizontal: spacing.lg,
  },
  heroZone: {
    width: RAY_LEN * 2,
    height: RAY_LEN * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raysWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rayArm: {
    alignItems: 'center',
  },
  ray: {
    width: pixelSize(8),
    height: RAY_LEN,
    backgroundColor: colors.accent,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontFamily: fonts.bold,
    color: colors.accent,
    letterSpacing: 3,
    textAlign: 'center',
    ...Platform.select({
      native: {
        textShadowColor: 'rgba(245, 197, 24, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
      },
      web: { textShadow: '0 0 16px rgba(245, 197, 24, 0.5)' },
    }),
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: colors.primary,
    borderWidth: 4,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeNumber: {
    fontSize: pixelSize(36),
    fontFamily: fonts.bold,
    color: colors.text,
  },
  rankPlate: {
    borderRadius: 0,
    borderWidth: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  rankText: {
    fontSize: fontSizes.md,
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    letterSpacing: 1,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

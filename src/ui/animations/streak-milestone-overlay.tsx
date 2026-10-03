import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../theme/tokens';
import { useT } from '../../lib/i18n';
import { Pip } from '../../features/mascot/components/pip';
import { identitySentence, identityStage, identityTitle } from '../../features/habits/utils/identity';

interface StreakMilestoneOverlayProps {
  visible: boolean;
  streakCount: number;
  habitName: string;
  category?: string;
  /** First time at 7, 21 or 66 days: "You're becoming someone who…" (G3). */
  newIdentity?: boolean;
  onComplete?: () => void;
}

type MilestoneLabelKey =
  | 'milestone_1w'
  | 'milestone_2w'
  | 'milestone_1m'
  | 'milestone_2m'
  | 'milestone_100d'
  | 'milestone_1y';

interface MilestoneConfig {
  emoji: string;
  labelKey: MilestoneLabelKey | null;
  color: string;
}

const MILESTONE_CONFIGS: Record<number, MilestoneConfig> = {
  7:   { emoji: '🔥', labelKey: 'milestone_1w',   color: '#f39c12' },
  14:  { emoji: '⚡', labelKey: 'milestone_2w',   color: '#e67e22' },
  21:  { emoji: '🛡️', labelKey: null,             color: '#4ecca3' },
  30:  { emoji: '💎', labelKey: 'milestone_1m',   color: '#5b8def' },
  60:  { emoji: '🏆', labelKey: 'milestone_2m',   color: '#9b59b6' },
  66:  { emoji: '🧠', labelKey: null,             color: '#e684ae' },
  100: { emoji: '👑', labelKey: 'milestone_100d', color: '#e74c3c' },
  365: { emoji: '🌟', labelKey: 'milestone_1y',   color: '#f1c40f' },
};

function getMilestoneConfig(count: number): MilestoneConfig {
  return MILESTONE_CONFIGS[count] ?? { emoji: '🔥', labelKey: null, color: colors.accent };
}

export function StreakMilestoneOverlay({ visible, streakCount, habitName, category = 'general', newIdentity = false, onComplete }: StreakMilestoneOverlayProps) {
  const T = useT();
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

      // One sequence: a later assignment would cancel the fade-in.
      overlayOpacity.value = withSequence(
        withTiming(1, { duration: 250 }),
        withDelay(
          2550,
          withTiming(0, { duration: 350 }, (finished) => {
            if (finished && onComplete) runOnJS(onComplete)();
          }),
        ),
      );

      // Timed pop and wobble: the previous under-damped springs overshot to
      // 2-3x the size, which only showed once the overlay became visible.
      badgeScale.value = withDelay(
        150,
        withSequence(
          withTiming(1.12, { duration: 260, easing: Easing.out(Easing.back(2)) }),
          withTiming(1, { duration: 160 }),
        ),
      );
      badgeRotate.value = withDelay(
        150,
        withSequence(
          withTiming(5, { duration: 160 }),
          withTiming(-3, { duration: 160 }),
          withTiming(0, { duration: 160 }),
        ),
      );

      flameOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
      flameY.value = withDelay(400, withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) }));

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
  const stage = newIdentity ? identityStage(streakCount) : null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]}>
      <Animated.View style={[styles.card, badgeStyle, { borderColor: config.color }]}>
        <View style={styles.heroRow}>
          <Pip expression="proud" mood="fire" size={64} />
          <Text style={styles.emoji}>{config.emoji}</Text>
        </View>
        <Text style={[styles.milestoneLabel, { color: config.color }]}>{T.milestone_streak.replace('{label}', config.labelKey ? T[config.labelKey] : T.milestone_days.replace('{n}', String(streakCount)))}</Text>
        <View style={[styles.countBadge, { backgroundColor: config.color }]}>
          <Text style={styles.countText}>{streakCount}</Text>
        </View>
        <Animated.View style={flameStyle}>
          <Text style={styles.habitName} numberOfLines={1}>{habitName}</Text>
          {stage ? (
            <>
              <Text style={styles.subtitle} testID="identity-sentence">{identitySentence(T, category)}</Text>
              <Text style={[styles.identityTitle, { color: config.color }]}>
                {T.identity_new_title.replace('{title}', identityTitle(T, stage))}
              </Text>
            </>
          ) : (
            <Text style={styles.subtitle}>{T.milestone_consistency}</Text>
          )}
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
    borderRadius: 0,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 240,
    // Long translations ("SÉRIE DE 2 SEMAINES !") wrap instead of leaving the screen.
    maxWidth: '88%',
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
  heroRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  identityTitle: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md), textAlign: 'center', marginTop: spacing.xs, letterSpacing: 1 },
  emoji: {
    fontSize: 56,
  },
  milestoneLabel: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    letterSpacing: 3,
    textAlign: 'center',
  },
  countBadge: {
    width: 72,
    height: 72,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xs,
  },
  countText: {
    fontSize: pixelSize(32),
    fontFamily: fonts.bold,
    color: colors.background,
  },
  habitName: {
    fontSize: pixelSize(fontSizes.md),
    color: colors.text,
    fontFamily: fonts.bold,
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

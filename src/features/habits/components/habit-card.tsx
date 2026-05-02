import { useState, useEffect, useRef, useMemo } from 'react';
import { Pressable, View, Text, StyleSheet, Animated as RNAnimated } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import { calculateXpEarned } from '../../../lib/constants/game-config';
import { CompletionBurst } from '../../../ui/animations/completion-burst';
import { getWeeklyTarget } from '../stores/habits-store';
import { useTheme } from '../../../ui/theme/theme-context';

interface HabitCardProps {
  name: string;
  category: string;
  streakCount: number;
  isCompletedToday: boolean;
  onComplete: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  index?: number;
  frequency?: string;
  weekCompletionCount?: number;
  contentType?: 'timer' | 'checklist' | 'link' | null;
  isPinned?: boolean;
}

const CONTENT_TYPE_ICON: Record<string, string> = {
  timer: '⏱️',
  checklist: '✅',
  link: '🔗',
};

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  health:       { color: '#4ecca3', icon: '💚' },
  fitness:      { color: '#ff6b35', icon: '💪' },
  learning:     { color: '#7b68ee', icon: '📚' },
  mindfulness:  { color: '#e684ae', icon: '🧘' },
  productivity: { color: '#00b4d8', icon: '⚡' },
  nutrition:    { color: '#22c55e', icon: '🥗' },
  sleep:        { color: '#8b5cf6', icon: '😴' },
  social:       { color: '#f59e0b', icon: '🤝' },
  creativity:   { color: '#ec4899', icon: '🎨' },
  finance:      { color: '#10b981', icon: '💰' },
  general:      { color: '#aaa',    icon: '⭐' },
  sport:        { color: '#ff6b35', icon: '💪' },
  studies:      { color: '#7b68ee', icon: '📚' },
  wellness:     { color: '#f5c518', icon: '✨' },
  meditation:   { color: '#e684ae', icon: '🧘' },
  stretching:   { color: '#ff6b35', icon: '🤸' },
  reading:      { color: '#00b4d8', icon: '📖' },
  custom:       { color: '#aaa',    icon: '⭐' },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.general;
}

function streakFlame(count: number): string {
  if (count === 0) return '';
  if (count < 3)  return '🔥';
  if (count < 7)  return '🔥🔥';
  if (count < 14) return '🔥🔥🔥';
  return '🔥🔥🔥🔥';
}

const SWIPE_THRESHOLD = 80;

export function HabitCard({
  name,
  category,
  streakCount,
  isCompletedToday,
  onComplete,
  onPress,
  onLongPress,
  index = 0,
  frequency = 'daily',
  weekCompletionCount = 0,
  contentType = null,
  isPinned = false,
}: HabitCardProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  wrapper: {
    position: 'relative',
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  reveal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.success,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    gap: spacing.sm,
  },
  revealText: {
    color: colors.background,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 3,
    overflow: 'visible',
    position: 'relative',
  },
  containerDone: {
    borderColor: colors.border,
    opacity: 0.65,
  },
  categoryBar: { width: 4 },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.sm,
  },
  info: { flex: 1, gap: 3 },
  name: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  nameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  category: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  streak: {
    fontSize: fontSizes.xs,
    color: colors.streak,
    fontWeight: 'bold',
  },
  weekProgress: {
    fontSize: fontSizes.xs,
    color: '#ff9500',
    fontWeight: 'bold',
  },
  xpPreview: {
    fontSize: fontSizes.xs,
    color: colors.xp,
    fontWeight: 'bold',
    opacity: 0.8,
  },
  checkButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDone: {
    backgroundColor: colors.success,
    borderColor: '#3ab88a',
    borderBottomWidth: 3,
  },
  checkText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  checkTextDone: {
    color: colors.background,
  },
}), [themeKey]);

  const { color: categoryColor, icon: categoryIcon } = getCategoryConfig(category);
  const nextXp = calculateXpEarned(streakCount + 1);
  const flame = streakFlame(streakCount);
  const [burst, setBurst] = useState(false);

  const isWeekly = frequency !== 'daily';
  const weeklyTarget = isWeekly ? getWeeklyTarget(frequency) : 1;
  const isWeeklyDone = isWeekly && weekCompletionCount >= weeklyTarget;
  const effectiveDone = isWeekly ? isWeeklyDone : isCompletedToday;

  // Entry animation (RN Animated — staggered slide-up + fade)
  const slideY = useRef(new RNAnimated.Value(18)).current;
  const entryOpacity = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(slideY, {
        toValue: 0,
        duration: 280,
        delay: index * 45,
        useNativeDriver: true,
      }),
      RNAnimated.timing(entryOpacity, {
        toValue: 1,
        duration: 280,
        delay: index * 45,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleComplete = () => {
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    onComplete();
  };

  // Swipe-to-complete (Reanimated 3 + Gesture Handler)
  const swipeX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .enabled(!effectiveDone)
    .activeOffsetX(10)
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      if (e.translationX > 0) {
        swipeX.value = Math.min(e.translationX, SWIPE_THRESHOLD + 30);
      }
    })
    .onEnd((e) => {
      if (e.translationX >= SWIPE_THRESHOLD) {
        runOnJS(handleComplete)();
      }
      swipeX.value = withSpring(0, { damping: 20, stiffness: 300 });
    });

  const cardSwipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: swipeX.value }],
  }));

  const revealStyle = useAnimatedStyle(() => ({
    opacity: interpolate(swipeX.value, [0, SWIPE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  return (
    <RNAnimated.View style={{ transform: [{ translateY: slideY }], opacity: entryOpacity }}>
      <View style={styles.wrapper}>
        {/* Green reveal layer behind the card */}
        <Animated.View style={[styles.reveal, revealStyle]}>
          <Text style={styles.revealText}>✓ DONE</Text>
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={cardSwipeStyle}>
            <Pressable
              onPress={onPress}
              onLongPress={onLongPress}
              style={[styles.container, effectiveDone && styles.containerDone]}
            >
              <CompletionBurst visible={burst} />
              <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />
              <View style={styles.content}>
                <View style={styles.info}>
                  <Text style={[styles.name, effectiveDone && styles.nameCompleted]} numberOfLines={1}>
                    {isPinned ? '📌 ' : ''}{categoryIcon} {name}{contentType ? ` ${CONTENT_TYPE_ICON[contentType]}` : ''}
                  </Text>
                  <View style={styles.meta}>
                    <Text style={[styles.category, { color: categoryColor }]}>
                      {category.toUpperCase()}
                    </Text>
                    {isWeekly ? (
                      <Text style={styles.weekProgress}>
                        {weekCompletionCount}/{weeklyTarget} week
                      </Text>
                    ) : (
                      streakCount > 0 && (
                        <Text style={styles.streak}>{flame} {streakCount}d</Text>
                      )
                    )}
                    {!effectiveDone && (
                      <Text style={styles.xpPreview}>+{nextXp} XP</Text>
                    )}
                  </View>
                </View>
                <Pressable
                  onPress={handleComplete}
                  style={[styles.checkButton, effectiveDone && styles.checkButtonDone]}
                  disabled={effectiveDone}
                  hitSlop={8}
                >
                  <Text style={[styles.checkText, effectiveDone && styles.checkTextDone]}>
                    {effectiveDone ? '✓' : ''}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </RNAnimated.View>
  );
}

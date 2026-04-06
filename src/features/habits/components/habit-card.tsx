import { useState } from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import { calculateXpEarned } from '../../../lib/constants/game-config';
import { CompletionBurst } from '../../../ui/animations/completion-burst';

interface HabitCardProps {
  name: string;
  category: string;
  streakCount: number;
  isCompletedToday: boolean;
  onComplete: () => void;
  onPress: () => void;
}

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

/** Fire intensity based on streak length */
function streakFlame(count: number): string {
  if (count === 0) return '';
  if (count < 3)  return '🔥';
  if (count < 7)  return '🔥🔥';
  if (count < 14) return '🔥🔥🔥';
  return '🔥🔥🔥🔥';
}

export function HabitCard({
  name,
  category,
  streakCount,
  isCompletedToday,
  onComplete,
  onPress,
}: HabitCardProps) {
  const { color: categoryColor, icon: categoryIcon } = getCategoryConfig(category);
  const nextXp = calculateXpEarned(streakCount + 1);
  const flame = streakFlame(streakCount);
  const [burst, setBurst] = useState(false);

  const handleComplete = () => {
    setBurst(true);
    setTimeout(() => setBurst(false), 700);
    onComplete();
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.container, isCompletedToday && styles.containerDone]}
    >
      <CompletionBurst visible={burst} />
      <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={[styles.name, isCompletedToday && styles.nameCompleted]} numberOfLines={1}>
            {categoryIcon} {name}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.category, { color: categoryColor }]}>
              {category.toUpperCase()}
            </Text>
            {streakCount > 0 && (
              <Text style={styles.streak}>{flame} {streakCount}d</Text>
            )}
            {!isCompletedToday && (
              <Text style={styles.xpPreview}>+{nextXp} XP</Text>
            )}
          </View>
        </View>
        <Pressable
          onPress={handleComplete}
          style={[styles.checkButton, isCompletedToday && styles.checkButtonDone]}
          disabled={isCompletedToday}
          hitSlop={8}
        >
          <Text style={[styles.checkText, isCompletedToday && styles.checkTextDone]}>
            {isCompletedToday ? '✓' : ''}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
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
});

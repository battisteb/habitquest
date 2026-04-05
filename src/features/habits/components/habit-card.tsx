import { Pressable, View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';

interface HabitCardProps {
  name: string;
  category: string;
  streakCount: number;
  isCompletedToday: boolean;
  onComplete: () => void;
  onPress: () => void;
}

const CATEGORY_CONFIG: Record<string, { color: string; icon: string }> = {
  health: { color: '#4ecca3', icon: '💚' },
  fitness: { color: '#ff6b35', icon: '💪' },
  learning: { color: '#7b68ee', icon: '📚' },
  mindfulness: { color: '#e684ae', icon: '🧘' },
  productivity: { color: '#00b4d8', icon: '⚡' },
  nutrition: { color: '#22c55e', icon: '🥗' },
  sleep: { color: '#8b5cf6', icon: '😴' },
  social: { color: '#f59e0b', icon: '🤝' },
  creativity: { color: '#ec4899', icon: '🎨' },
  finance: { color: '#10b981', icon: '💰' },
  general: { color: '#aaa', icon: '⭐' },
  // Legacy categories
  sport: { color: '#ff6b35', icon: '💪' },
  studies: { color: '#7b68ee', icon: '📚' },
  wellness: { color: '#f5c518', icon: '✨' },
  meditation: { color: '#e684ae', icon: '🧘' },
  stretching: { color: '#ff6b35', icon: '🤸' },
  reading: { color: '#00b4d8', icon: '📖' },
  custom: { color: '#aaa', icon: '⭐' },
};

function getCategoryConfig(category: string) {
  return CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.general;
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

  return (
    <Pressable onPress={onPress} style={styles.container}>
      <View style={[styles.categoryBar, { backgroundColor: categoryColor }]} />
      <View style={styles.content}>
        <View style={styles.info}>
          <Text style={[styles.name, isCompletedToday && styles.nameCompleted]}>
            {categoryIcon} {name}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.category, { color: categoryColor }]}>
              {category.toUpperCase()}
            </Text>
            {streakCount > 0 && (
              <Text style={styles.streak}>
                {streakCount}d streak
              </Text>
            )}
          </View>
        </View>
        <Pressable
          onPress={onComplete}
          style={[styles.checkButton, isCompletedToday && styles.checkButtonDone]}
          disabled={isCompletedToday}
        >
          <Text style={styles.checkText}>{isCompletedToday ? '✓' : ''}</Text>
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
    overflow: 'hidden',
  },
  categoryBar: {
    width: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + 2,
    gap: spacing.sm,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  nameCompleted: {
    opacity: 0.5,
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
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
  checkButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkButtonDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkText: {
    color: colors.text,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
});

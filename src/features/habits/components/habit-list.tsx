import { FlatList, View, Text, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { habitsStore$, completeHabit } from '../stores/habits-store';
import { HabitCard } from './habit-card';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';

export function HabitList() {
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const todayCompletions = use$(habitsStore$.todayCompletions);
  const router = useRouter();

  if (habits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No quests yet</Text>
        <Text style={styles.emptySubtitle}>Tap + to create your first habit</Text>
      </View>
    );
  }

  const completedCount = Object.values(todayCompletions).filter(Boolean).length;
  const totalCount = habits.length;

  return (
    <View style={styles.container}>
      <View style={styles.progress}>
        <Text style={styles.progressText}>
          {completedCount}/{totalCount} completed
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <HabitCard
            name={item.name}
            category={item.category}
            streakCount={streaks[item.id]?.current_count ?? 0}
            isCompletedToday={!!todayCompletions[item.id]}
            onComplete={() => completeHabit(item.id)}
            onPress={() => router.push(`/habit/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progress: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginTop: spacing.xs,
  },
});

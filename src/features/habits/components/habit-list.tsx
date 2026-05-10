import { useState, useCallback, useMemo } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useRouter } from 'expo-router';
import { habitsStore$, completeHabit } from '../stores/habits-store';
import { HabitCard } from './habit-card';
import { XpToast } from '../../../ui/animations/xp-toast';
import { calculateXpEarned, calculateGoldEarned } from '../../../lib/constants/game-config';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

export function HabitList() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
}), [themeKey]);
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const todayCompletions = use$(habitsStore$.todayCompletions);
  const router = useRouter();
  const [xpToast, setXpToast] = useState<{ visible: boolean; xp: number; gold: number }>({
    visible: false,
    xp: 0,
    gold: 0,
  });

  const handleComplete = useCallback(async (habitId: string) => {
    const streak = streaks[habitId];
    const currentCount = streak?.current_count ?? 0;
    const xp = calculateXpEarned(currentCount + 1);
    const gold = calculateGoldEarned(xp);

    await completeHabit(habitId);

    setXpToast({ visible: true, xp, gold });
  }, [streaks]);

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
      <XpToast
        visible={xpToast.visible}
        xpAmount={xpToast.xp}
        goldAmount={xpToast.gold}
        onComplete={() => setXpToast((prev) => ({ ...prev, visible: false }))}
      />
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
            onComplete={() => handleComplete(item.id)}
            onPress={() => router.push(`/habit/${item.id}`)}
            emoji={(item as any).emoji ?? null}
          />
        )}
      />
    </View>
  );
}



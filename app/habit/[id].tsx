import { View, Text, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { habitsStore$, archiveHabit } from '../../src/features/habits/stores/habits-store';
import { colors, spacing, fontSizes } from '../../src/ui/theme/tokens';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);

  const habit = habits.find((h) => h.id === id);
  const streak = id ? streaks[id] : undefined;

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Habit not found</Text>
      </View>
    );
  }

  const handleArchive = () => {
    Alert.alert('Archive quest', `Remove "${habit.name}" from your active quests?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveHabit(habit.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />

      <Text style={styles.title}>{habit.name}</Text>
      <Text style={styles.category}>{habit.category.toUpperCase()}</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak?.current_count ?? 0}</Text>
          <Text style={styles.statLabel}>CURRENT STREAK</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{streak?.longest_count ?? 0}</Text>
          <Text style={styles.statLabel}>BEST STREAK</Text>
        </View>
      </View>

      <PixelButton
        title="Archive quest"
        onPress={handleArchive}
        variant="secondary"
        style={styles.archiveButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  category: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statValue: {
    fontSize: fontSizes.title,
    fontWeight: 'bold',
    color: colors.streak,
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  archiveButton: {
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
});

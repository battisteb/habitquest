import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStats } from '../../src/features/habits/hooks/use-stats';
import { WeeklyChart } from '../../src/features/habits/components/weekly-chart';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const stats = useStats();

  if (stats.isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>STATS</Text>

      <View style={styles.statRow}>
        <StatCard value={stats.totalCompletions} label="TOTAL DONE" color={colors.success} />
        <StatCard
          value={`${stats.completionRateThisWeek}%`}
          label="WEEK RATE"
          color={colors.xp}
        />
      </View>

      <View style={styles.statRow}>
        <StatCard
          value={stats.currentActiveStreaks}
          label="ACTIVE STREAKS"
          color={colors.streak}
        />
        <StatCard value={stats.bestStreak} label="BEST STREAK" color={colors.accent} />
      </View>

      {stats.weeklyCompletions.length > 0 && <WeeklyChart data={stats.weeklyCompletions} />}
    </ScrollView>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.md,
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
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
});

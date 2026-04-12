import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useStats } from '../../src/features/habits/hooks/use-stats';
import { WeeklyChart } from '../../src/features/habits/components/weekly-chart';
import { MonthlyHeatmap } from '../../src/features/habits/components/monthly-heatmap';
import { sessionsStore$ } from '../../src/features/training/stores/sessions-store';
import { decksStore$ } from '../../src/features/training/stores/decks-store';
import { getDueCards } from '../../src/features/training/types/flashcard';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { AdBanner } from '../../src/features/monetization/components/ad-banner';
import { PremiumGate } from '../../src/features/monetization/components/premium-gate';

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const stats = useStats();
  const sessions = use$(sessionsStore$.sessions);
  const decks = use$(decksStore$.decks);

  const totalWorkouts = sessions.reduce((sum, s) => sum + s.completedCount, 0);
  const totalCardReviews = decks.reduce((sum, d) => sum + d.totalReviews, 0);
  const dueCardsTotal = decks.reduce((sum, d) => sum + getDueCards(d).length, 0);

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

      {stats.monthlyCompletions.length > 0 && <MonthlyHeatmap data={stats.monthlyCompletions} />}

      {/* Training stats */}
      {(sessions.length > 0 || decks.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TRAINING</Text>
          <View style={styles.statRow}>
            <StatCard value={sessions.length} label="SESSIONS" color={colors.accent} />
            <StatCard value={totalWorkouts} label="WORKOUTS DONE" color={colors.success} />
          </View>
          {decks.length > 0 && (
            <View style={styles.statRow}>
              <StatCard value={decks.length} label="DECKS" color={colors.primary} />
              <StatCard value={totalCardReviews} label="CARDS REVIEWED" color={colors.xp} />
              <StatCard
                value={dueCardsTotal}
                label="DUE TODAY"
                color={dueCardsTotal > 0 ? colors.streak : colors.textMuted}
              />
            </View>
          )}
        </View>
      )}

      <PixelButton
        title="📊 Weekly Recap"
        onPress={() => router.push('/weekly-recap')}
        variant="secondary"
      />
      <PixelButton
        title="View Achievements"
        onPress={() => router.push('/achievements')}
        variant="secondary"
      />

      {/* Full history — premium only */}
      <PremiumGate
        lockedLabel="Historique complet disponible en Premium"
        lockedIcon="📈"
      >
        <View />
      </PremiumGate>

      <AdBanner position="inline" />
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
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

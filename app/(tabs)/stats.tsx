import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useStats } from '../../src/features/habits/hooks/use-stats';
import { WeeklyChart } from '../../src/features/habits/components/weekly-chart';
import { MonthlyHeatmap } from '../../src/features/habits/components/monthly-heatmap';
import { CategoryBreakdown } from '../../src/features/habits/components/category-breakdown';
import { sessionsStore$ } from '../../src/features/training/stores/sessions-store';
import { decksStore$ } from '../../src/features/training/stores/decks-store';
import { getDueCards } from '../../src/features/training/types/flashcard';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { AdBanner } from '../../src/features/monetization/components/ad-banner';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';

export default function StatsScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
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
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={styles.title}>{T.stats_title}</Text>

      <View style={styles.statRow}>
        <StatCard value={stats.totalCompletions} label={T.stats_total_done} color={colors.success} />
        <StatCard
          value={`${stats.completionRateThisWeek}%`}
          label={T.stats_week_rate}
          color={colors.xp}
        />
      </View>

      <View style={styles.statRow}>
        <StatCard
          value={stats.currentActiveStreaks}
          label={T.stats_active_streaks}
          color={colors.streak}
        />
        <StatCard value={stats.bestStreak} label={T.stats_best_streak} color={colors.accent} />
      </View>

      {stats.weeklyCompletions.length > 0 && <WeeklyChart data={stats.weeklyCompletions} />}

      <MonthlyHeatmap />

      <CategoryBreakdown />

      {/* Training stats */}
      {(sessions.length > 0 || decks.length > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{T.stats_section_training}</Text>
          <View style={styles.statRow}>
            <StatCard value={sessions.length} label={T.stats_sessions} color={colors.accent} />
            <StatCard value={totalWorkouts} label={T.stats_workouts} color={colors.success} />
          </View>
          {decks.length > 0 && (
            <View style={styles.statRow}>
              <StatCard value={decks.length} label={T.stats_decks} color={colors.primary} />
              <StatCard value={totalCardReviews} label={T.stats_cards_reviewed} color={colors.xp} />
              <StatCard
                value={dueCardsTotal}
                label={T.stats_due_today}
                color={dueCardsTotal > 0 ? colors.streak : colors.textMuted}
              />
            </View>
          )}
        </View>
      )}

      <PixelButton
        title={T.stats_btn_recap}
        onPress={() => router.push('/weekly-recap')}
        variant="secondary"
      />
      <PixelButton
        title={T.stats_btn_achievements}
        onPress={() => router.push('/achievements')}
        variant="secondary"
      />

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
  const styles = createStyles();
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
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
}

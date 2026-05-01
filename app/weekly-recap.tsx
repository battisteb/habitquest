import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../src/ui/components/pixel-button';
import { supabase } from '../src/lib/supabase/client';
import { authStore$ } from '../src/features/auth/stores/auth-store';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';
import { useT } from '../src/lib/i18n';

interface DayData {
  label: string;
  completions: number;
  xp: number;
}

interface HabitHighlight {
  name: string;
  count: number;
}

interface WeekStats {
  days: DayData[];
  totalCompletions: number;
  totalXp: number;
  bestStreak: number;
  completionRate: number;
  activeHabitsCount: number;
  previousTotal: number | null;
  topHabit: HabitHighlight | null;
  missedHabit: HabitHighlight | null;
}

function getWeekDates(weeksAgo = 0): { start: Date; end: Date; days: Date[] } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff - weeksAgo * 7);
  monday.setHours(0, 0, 0, 0);
  const end = new Date(monday);
  end.setDate(monday.getDate() + 7);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return { start: monday, end, days };
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

function tpl(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export default function WeeklyRecapScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => createStyles(), [themeKey]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  const dayLabels = useMemo(
    () => [T.day_mon, T.day_tue, T.day_wed, T.day_thu, T.day_fri, T.day_sat, T.day_sun],
    [T],
  );

  useEffect(() => {
    loadWeekStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadWeekStats() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    setLoading(true);
    try {
      const { start, days } = getWeekDates(0);
      const { start: prevStart, end: prevEnd } = getWeekDates(1);

      const { data: habits } = await supabase
        .from('habits')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (!habits?.length) {
        setStats({
          days: days.map((_, i) => ({ label: dayLabels[i], completions: 0, xp: 0 })),
          totalCompletions: 0,
          totalXp: 0,
          bestStreak: 0,
          completionRate: 0,
          activeHabitsCount: 0,
          previousTotal: null,
          topHabit: null,
          missedHabit: null,
        });
        setLoading(false);
        return;
      }

      const habitIds = habits.map((h) => h.id);
      const habitNameById = new Map(habits.map((h) => [h.id, h.name]));

      // Current week
      const { data: completions } = await supabase
        .from('completions')
        .select('habit_id, completed_at, xp_earned')
        .in('habit_id', habitIds)
        .gte('completed_at', start.toISOString());

      // Previous week — count only
      const { count: previousCount } = await supabase
        .from('completions')
        .select('*', { count: 'exact', head: true })
        .in('habit_id', habitIds)
        .gte('completed_at', prevStart.toISOString())
        .lt('completed_at', prevEnd.toISOString());

      // Group by day
      const dayMap = new Map<string, { completions: number; xp: number }>();
      days.forEach((d) => dayMap.set(formatDateKey(d), { completions: 0, xp: 0 }));
      // Per-habit completion count (for top/missed insights)
      const perHabit = new Map<string, number>(habits.map((h) => [h.id, 0]));

      completions?.forEach((c) => {
        const key = c.completed_at.split('T')[0];
        const entry = dayMap.get(key);
        if (entry) {
          entry.completions++;
          entry.xp += c.xp_earned ?? 0;
        }
        perHabit.set(c.habit_id, (perHabit.get(c.habit_id) ?? 0) + 1);
      });

      const dayData: DayData[] = days.map((d, i) => {
        const entry = dayMap.get(formatDateKey(d)) ?? { completions: 0, xp: 0 };
        return { label: dayLabels[i], ...entry };
      });

      const totalCompletions = completions?.length ?? 0;
      const totalXp = completions?.reduce((sum, c) => sum + (c.xp_earned ?? 0), 0) ?? 0;

      // Best streak
      const { data: streaks } = await supabase
        .from('streaks')
        .select('longest_count')
        .in('habit_id', habitIds);
      const bestStreak = streaks?.reduce((max, s) => Math.max(max, s.longest_count), 0) ?? 0;

      const todayIndex = Math.min(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, 6);
      const pastDays = todayIndex + 1;
      const maxPossible = habits.length * pastDays;
      const completionRate = maxPossible > 0
        ? Math.round((totalCompletions / maxPossible) * 100)
        : 0;

      // Top + missed habit
      const sortedHabits = [...perHabit.entries()].sort((a, b) => b[1] - a[1]);
      const topEntry = sortedHabits[0];
      const missedEntry = sortedHabits[sortedHabits.length - 1];
      const topHabit = topEntry && topEntry[1] > 0
        ? { name: habitNameById.get(topEntry[0]) ?? '', count: topEntry[1] }
        : null;
      const missedHabit =
        missedEntry && missedEntry !== topEntry && habits.length > 1
          ? { name: habitNameById.get(missedEntry[0]) ?? '', count: missedEntry[1] }
          : null;

      setStats({
        days: dayData,
        totalCompletions,
        totalXp,
        bestStreak,
        completionRate,
        activeHabitsCount: habits.length,
        previousTotal: previousCount ?? 0,
        topHabit,
        missedHabit,
      });
    } finally {
      setLoading(false);
    }
  }

  const maxCompletions = stats
    ? Math.max(...stats.days.map((d) => d.completions), 1)
    : 1;

  function compareLabel(): { text: string; color: string } {
    if (!stats || stats.previousTotal === null || stats.previousTotal === 0) {
      return { text: T.recap_compare_no_data, color: colors.textMuted };
    }
    const diff = stats.totalCompletions - stats.previousTotal;
    if (diff > 0)
      return { text: tpl(T.recap_compare_better, { n: diff }), color: colors.success };
    if (diff < 0)
      return { text: tpl(T.recap_compare_worse, { n: -diff }), color: colors.danger };
    return { text: T.recap_compare_equal, color: colors.textMuted };
  }

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title={T.recap_back} onPress={() => router.back()} variant="ghost" />

      <View style={styles.header}>
        <Text style={styles.screenLabel}>{T.recap_label}</Text>
        <Text style={styles.title}>{T.recap_title}</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : stats ? (
        <>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.success }]}>
                {stats.totalCompletions}
              </Text>
              <Text style={styles.statLabel}>{T.recap_stat_done}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.xp }]}>
                +{stats.totalXp}
              </Text>
              <Text style={styles.statLabel}>{T.recap_stat_xp}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.streak }]}>
                {stats.bestStreak}🔥
              </Text>
              <Text style={styles.statLabel}>{T.recap_stat_best}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.completionRate}%
              </Text>
              <Text style={styles.statLabel}>{T.recap_stat_rate}</Text>
            </View>
          </View>

          {/* Compare vs last week */}
          <View style={styles.compareCard}>
            <Text style={styles.compareTitle}>{T.recap_compare_title}</Text>
            <Text style={[styles.compareValue, { color: compareLabel().color }]}>
              {compareLabel().text}
            </Text>
          </View>

          {/* Bar chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{T.recap_chart_title}</Text>
            <View style={styles.chart}>
              {stats.days.map((day, i) => {
                const isToday = i === Math.min(
                  new Date().getDay() === 0 ? 6 : new Date().getDay() - 1,
                  6,
                );
                const height = Math.max((day.completions / maxCompletions) * 80, 4);
                return (
                  <View key={day.label} style={styles.bar}>
                    <Text style={styles.barXp}>
                      {day.xp > 0 ? `+${day.xp}` : ''}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            height,
                            backgroundColor: isToday
                              ? colors.primary
                              : day.completions > 0
                              ? colors.success
                              : colors.border,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isToday && { color: colors.primary }]}>
                      {day.label}
                    </Text>
                    <Text style={styles.barCount}>{day.completions}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Top habit */}
          {stats.topHabit && (
            <View style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{T.recap_top_title}</Text>
              <Text style={styles.highlightName}>{stats.topHabit.name}</Text>
              <Text style={styles.highlightSub}>
                {tpl(T.recap_top_done, { n: stats.topHabit.count })}
              </Text>
            </View>
          )}

          {/* Missed habit */}
          {stats.missedHabit && (
            <View style={[styles.highlightCard, styles.highlightCardMissed]}>
              <Text style={[styles.highlightTitle, { color: colors.warning }]}>
                {T.recap_missed_title}
              </Text>
              <Text style={styles.highlightName}>{stats.missedHabit.name}</Text>
              <Text style={styles.highlightSub}>
                {tpl(T.recap_missed_done, { n: stats.missedHabit.count })}
              </Text>
            </View>
          )}

          {/* Motivation message */}
          <View style={styles.motivationCard}>
            <Text style={styles.motivationText}>
              {stats.completionRate >= 80
                ? T.recap_motivation_excellent
                : stats.completionRate >= 60
                ? T.recap_motivation_great
                : stats.completionRate >= 40
                ? T.recap_motivation_solid
                : T.recap_motivation_seed}
            </Text>
            <Text style={styles.motivationSub}>
              {tpl(T.recap_active_habits, {
                n: stats.activeHabitsCount,
                s: stats.activeHabitsCount !== 1 ? 's' : '',
              })}{' '}
              {stats.completionRate >= 70
                ? T.recap_motivation_sub_strong
                : T.recap_motivation_sub_consistent}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function createStyles() {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    header: {
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    screenLabel: {
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 2,
    },
    title: {
      fontSize: fontSizes.xl,
      fontWeight: 'bold',
      color: colors.text,
    },
    statsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.sm,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontSize: fontSizes.lg,
      fontWeight: 'bold',
    },
    statLabel: {
      fontSize: fontSizes.xs - 1,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 1,
    },
    compareCard: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    compareTitle: {
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 1.5,
    },
    compareValue: {
      fontSize: fontSizes.sm,
      fontWeight: 'bold',
    },
    chartCard: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.md,
    },
    chartTitle: {
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 2,
    },
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: spacing.xs,
      height: 140,
    },
    bar: {
      flex: 1,
      alignItems: 'center',
      gap: 3,
      justifyContent: 'flex-end',
    },
    barXp: {
      fontSize: 7,
      color: colors.xp,
      fontWeight: 'bold',
    },
    barTrack: {
      width: '100%',
      height: 80,
      justifyContent: 'flex-end',
    },
    barFill: {
      width: '100%',
      borderRadius: 2,
      minHeight: 4,
    },
    barLabel: {
      fontSize: fontSizes.xs - 1,
      fontWeight: 'bold',
      color: colors.textMuted,
    },
    barCount: {
      fontSize: 8,
      color: colors.textMuted,
    },
    highlightCard: {
      backgroundColor: colors.surface,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: colors.success + '66',
      padding: spacing.md,
      gap: 2,
    },
    highlightCardMissed: {
      borderColor: colors.warning + '66',
    },
    highlightTitle: {
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
      color: colors.success,
      letterSpacing: 1.5,
    },
    highlightName: {
      fontSize: fontSizes.md,
      fontWeight: 'bold',
      color: colors.text,
    },
    highlightSub: {
      fontSize: fontSizes.xs,
      color: colors.textMuted,
    },
    motivationCard: {
      backgroundColor: colors.primary + '18',
      borderWidth: 2,
      borderColor: colors.primary + '44',
      borderRadius: 4,
      padding: spacing.md,
      gap: spacing.xs,
    },
    motivationText: {
      fontSize: fontSizes.md,
      fontWeight: 'bold',
      color: colors.text,
    },
    motivationSub: {
      fontSize: fontSizes.xs,
      color: colors.textSecondary,
      lineHeight: 16,
    },
  });
}

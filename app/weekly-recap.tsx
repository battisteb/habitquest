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

interface DayData {
  label: string;
  completions: number;
  xp: number;
}

interface WeekStats {
  days: DayData[];
  totalCompletions: number;
  totalXp: number;
  bestStreak: number;
  completionRate: number;
  activeHabitsCount: number;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getWeekDates(): { start: Date; days: Date[] } {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }
  return { start: monday, days };
}

function formatDateKey(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function WeeklyRecapScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
}), [themeKey]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<WeekStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeekStats();
  }, []);

  async function loadWeekStats() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    setLoading(true);
    try {
      const { start, days } = getWeekDates();

      // Get active habits
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_archived', false);

      if (!habits?.length) {
        setStats({
          days: days.map((d, i) => ({ label: DAY_LABELS[i], completions: 0, xp: 0 })),
          totalCompletions: 0,
          totalXp: 0,
          bestStreak: 0,
          completionRate: 0,
          activeHabitsCount: 0,
        });
        setLoading(false);
        return;
      }

      const habitIds = habits.map((h) => h.id);

      // Fetch this week's completions
      const { data: completions } = await supabase
        .from('completions')
        .select('completed_at, xp_earned')
        .in('habit_id', habitIds)
        .gte('completed_at', start.toISOString());

      // Group by day
      const dayMap = new Map<string, { completions: number; xp: number }>();
      days.forEach((d) => dayMap.set(formatDateKey(d), { completions: 0, xp: 0 }));

      completions?.forEach((c) => {
        const key = c.completed_at.split('T')[0];
        const entry = dayMap.get(key);
        if (entry) {
          entry.completions++;
          entry.xp += c.xp_earned ?? 0;
        }
      });

      const dayData: DayData[] = days.map((d, i) => {
        const entry = dayMap.get(formatDateKey(d)) ?? { completions: 0, xp: 0 };
        return { label: DAY_LABELS[i], ...entry };
      });

      const totalCompletions = completions?.length ?? 0;
      const totalXp = completions?.reduce((sum, c) => sum + (c.xp_earned ?? 0), 0) ?? 0;

      // Best streak among habits
      const { data: streaks } = await supabase
        .from('streaks')
        .select('longest_count')
        .in('habit_id', habitIds);
      const bestStreak = streaks?.reduce((max, s) => Math.max(max, s.longest_count), 0) ?? 0;

      // Today is index dayOfWeek-1 (Mon=0), count past days
      const todayIndex = Math.min(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1, 6);
      const pastDays = todayIndex + 1;
      const maxPossible = habits.length * pastDays;
      const completionRate = maxPossible > 0
        ? Math.round((totalCompletions / maxPossible) * 100)
        : 0;

      setStats({
        days: dayData,
        totalCompletions,
        totalXp,
        bestStreak,
        completionRate,
        activeHabitsCount: habits.length,
      });
    } finally {
      setLoading(false);
    }
  }

  const maxCompletions = stats
    ? Math.max(...stats.days.map((d) => d.completions), 1)
    : 1;

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />

      <View style={styles.header}>
        <Text style={styles.screenLabel}>THIS WEEK</Text>
        <Text style={styles.title}>Weekly Recap</Text>
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
              <Text style={styles.statLabel}>DONE</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.xp }]}>
                +{stats.totalXp}
              </Text>
              <Text style={styles.statLabel}>XP</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.streak }]}>
                {stats.bestStreak}🔥
              </Text>
              <Text style={styles.statLabel}>BEST</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>
                {stats.completionRate}%
              </Text>
              <Text style={styles.statLabel}>RATE</Text>
            </View>
          </View>

          {/* Bar chart */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>COMPLETIONS BY DAY</Text>
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

          {/* Motivation message */}
          <View style={styles.motivationCard}>
            <Text style={styles.motivationText}>
              {stats.completionRate >= 80
                ? '🏆 Outstanding week! You\'re on fire!'
                : stats.completionRate >= 60
                ? '💪 Great progress! Keep the momentum going.'
                : stats.completionRate >= 40
                ? '⚔️ Solid effort. Push harder next week!'
                : '🌱 Every journey starts with a single step. Keep going!'}
            </Text>
            <Text style={styles.motivationSub}>
              You have {stats.activeHabitsCount} active habit{stats.activeHabitsCount !== 1 ? 's' : ''} —
              {stats.completionRate >= 70 ? ' you\'re crushing it 🔥' : ' stay consistent 🎯'}
            </Text>
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}



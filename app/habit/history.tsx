import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { habitsStore$ } from '../../src/features/habits/stores/habits-store';
import { supabase } from '../../src/lib/supabase/client';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';

const DOT_SIZE = 28;
const DOT_GAP = 3;
const DAYS = 90;

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildDates(): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dates: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    dates.push(formatDate(d));
  }
  return dates;
}

function computeLongestStreak(dates: string[], completedSet: Set<string>): number {
  let longest = 0;
  let current = 0;
  for (const d of dates) {
    if (completedSet.has(d)) {
      current++;
      if (current > longest) longest = current;
    } else {
      current = 0;
    }
  }
  return longest;
}

function computeCurrentStreak(dates: string[], completedSet: Set<string>): number {
  let count = 0;
  for (let i = dates.length - 1; i >= 0; i--) {
    if (completedSet.has(dates[i])) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

export default function HabitHistoryScreen() {
  const T = useT();
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
    marginBottom: spacing.sm,
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
  monthRow: {
    flexDirection: 'row',
    gap: DOT_GAP,
    marginBottom: 2,
  },
  monthCell: {
    width: DOT_SIZE,
    alignItems: 'flex-start',
  },
  monthLabel: {
    fontSize: fontSizes.xs - 1,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  calendarGrid: {
    flexDirection: 'row',
    gap: DOT_GAP,
    flexWrap: 'wrap',
  },
  weekColumn: {
    flexDirection: 'column',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
}), [themeKey]);
  const { habitId, habitName } = useLocalSearchParams<{ habitId: string; habitName: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const streaks = use$(habitsStore$.streaks);

  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const dates = buildDates();
  const todayStr = formatDate(new Date());
  const streak = habitId ? streaks[habitId] : undefined;

  useEffect(() => {
    if (!habitId) return;

    const ninetyDaysAgo = dates[0];

    supabase
      .from('completions')
      .select('completed_at')
      .eq('habit_id', habitId)
      .gte('completed_at', `${ninetyDaysAgo}T00:00:00.000Z`)
      .then(({ data }) => {
        const set = new Set<string>();
        data?.forEach((c) => {
          const d = new Date(c.completed_at);
          set.add(formatDate(d));
        });
        setCompletedSet(set);
        setLoading(false);
      });
  }, [habitId]);

  // Group dates into weeks of 7 for the grid
  const weeks: string[][] = [];
  for (let i = 0; i < dates.length; i += 7) {
    weeks.push(dates.slice(i, i + 7));
  }

  // Find month label positions: column index -> month name (when month changes)
  const monthLabels: Record<number, string> = {};
  let lastMonth = -1;
  weeks.forEach((week, colIdx) => {
    const firstDay = new Date(week[0]);
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels[colIdx] = MONTH_ABBR[month];
      lastMonth = month;
    }
  });

  // Stats
  const totalCompletions = completedSet.size;
  const currentStreak = streak?.current_count ?? computeCurrentStreak(dates, completedSet);
  const longestStreak = streak?.longest_count ?? computeLongestStreak(dates, completedSet);
  const pastDates = dates.filter((d) => d <= todayStr);
  const completionRate =
    pastDates.length > 0 ? Math.round((completedSet.size / pastDates.length) * 100) : 0;

  function getDotStyle(dateStr: string) {
    const isToday = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const isCompleted = completedSet.has(dateStr);

    if (isFuture) {
      return {
        backgroundColor: colors.border,
        borderWidth: 0,
        borderColor: 'transparent',
        opacity: 1,
      };
    }
    if (isCompleted) {
      return {
        backgroundColor: '#4CAF50',
        borderWidth: isToday ? 2 : 0,
        borderColor: isToday ? colors.primary : 'transparent',
        opacity: 1,
      };
    }
    // missed
    return {
      backgroundColor: '#F44336',
      borderWidth: isToday ? 2 : 0,
      borderColor: isToday ? colors.primary : 'transparent',
      opacity: isToday ? 1 : 0.4,
    };
  }

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title={T.common_back} onPress={() => router.back()} variant="ghost" />

      <View style={styles.header}>
        <Text style={styles.screenLabel}>{T.habit_history_label}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {habitName ?? T.habit_history_default_name}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {/* Month labels row */}
          <View style={styles.monthRow}>
            {weeks.map((_, colIdx) => (
              <View key={colIdx} style={styles.monthCell}>
                <Text style={styles.monthLabel}>{monthLabels[colIdx] ?? ''}</Text>
              </View>
            ))}
          </View>

          {/* Calendar grid: columns = weeks, rows = days within week */}
          <View style={styles.calendarGrid}>
            {weeks.map((week, colIdx) => (
              <View key={colIdx} style={styles.weekColumn}>
                {week.map((dateStr) => {
                  const dotStyle = getDotStyle(dateStr);
                  return (
                    <View
                      key={dateStr}
                      style={[
                        styles.dot,
                        {
                          backgroundColor: dotStyle.backgroundColor,
                          borderWidth: dotStyle.borderWidth,
                          borderColor: dotStyle.borderColor,
                          opacity: dotStyle.opacity,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={styles.legendText}>{T.habit_history_legend_done}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#F44336', opacity: 0.4 }]} />
              <Text style={styles.legendText}>{T.habit_history_legend_missed}</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors.border }]} />
              <Text style={styles.legendText}>{T.habit_history_legend_future}</Text>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: colors.border, borderWidth: 2, borderColor: colors.primary },
                ]}
              />
              <Text style={styles.legendText}>{T.habit_history_legend_today}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#4CAF50' }]}>{totalCompletions}</Text>
              <Text style={styles.statLabel}>{T.habit_history_stat_total}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.streak }]}>{currentStreak}</Text>
              <Text style={styles.statLabel}>{T.habit_history_stat_streak}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.accent }]}>{longestStreak}</Text>
              <Text style={styles.statLabel}>{T.habit_history_stat_best}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{completionRate}%</Text>
              <Text style={styles.statLabel}>{T.habit_history_stat_rate}</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}



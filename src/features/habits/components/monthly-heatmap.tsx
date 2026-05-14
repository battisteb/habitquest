import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { lang$ } from '../../../lib/i18n';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';
import { useMonthlyCompletions } from '../hooks/use-monthly-completions';

const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS_FR = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_LABELS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function countToColor(count: number): string {
  if (count === 0) return colors.border;
  if (count === 1) return '#1a5c3a';
  if (count === 2) return '#22874f';
  if (count <= 4) return '#2ecc71';
  return '#4ecca3';
}

const CELL_SIZE = 34;

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  dayLabel: {
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCell: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  todayDot: {
    fontSize: 18,
    color: colors.primary,
    lineHeight: 18,
  },
  legend: {
    flexDirection: 'row',
    gap: 4,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});

interface MonthlyHeatmapProps {
  habitId?: string;
}

export function MonthlyHeatmap({ habitId }: MonthlyHeatmapProps = {}) {
  const lang = use$(lang$);
  const { counts, isLoading, year, month } = useMonthlyCompletions(undefined, undefined, habitId);

  const monthName = (lang === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN)[month];
  const dayLabels = lang === 'fr' ? DAY_LABELS_FR : DAY_LABELS_EN;

  const cells = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Convert Sun=0…Sat=6 to Mon=0…Sun=6
    const firstDow = new Date(year, month, 1).getDay();
    const offset = firstDow === 0 ? 6 : firstDow - 1;

    const result: Array<{ day: number | null; dateStr: string | null }> = [];
    for (let i = 0; i < offset; i++) result.push({ day: null, dateStr: null });
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      result.push({ day: d, dateStr: `${year}-${mm}-${dd}` });
    }
    return result;
  }, [year, month]);

  const today = new Date().toISOString().slice(0, 10);

  if (isLoading) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {monthName.toUpperCase()} {year}
      </Text>

      <View style={styles.dayLabelsRow}>
        {dayLabels.map((l, i) => (
          <Text key={i} style={styles.dayLabel}>{l}</Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, i) => {
          if (!cell.dateStr) return <View key={i} style={styles.cell} />;
          const count = counts[cell.dateStr] ?? 0;
          const isToday = cell.dateStr === today;
          const isFuture = cell.dateStr > today;
          return (
            <View
              key={i}
              style={[
                styles.cell,
                { backgroundColor: isFuture ? 'transparent' : countToColor(count) },
                isToday && styles.todayCell,
              ]}
            >
              {isToday && <Text style={styles.todayDot}>·</Text>}
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {[0, 1, 2, 4, 5].map((n) => (
          <View key={n} style={[styles.legendDot, { backgroundColor: countToColor(n) }]} />
        ))}
      </View>
    </View>
  );
}

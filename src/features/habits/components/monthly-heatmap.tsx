import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';

interface MonthlyHeatmapProps {
  data: { date: string; count: number }[];
}

const DOT_SIZE = 20;
const DOT_GAP = 3;

const HEAT_COLORS = {
  empty: '#2D2D4E',
  low: '#2d5a27',
  mid: '#4CAF50',
  high: '#8BC34A',
} as const;

function getDotColor(count: number): string {
  if (count === 0) return HEAT_COLORS.empty;
  if (count === 1) return HEAT_COLORS.low;
  if (count === 2) return HEAT_COLORS.mid;
  return HEAT_COLORS.high;
}

export function MonthlyHeatmap({ data }: MonthlyHeatmapProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LAST 30 DAYS</Text>
      <View style={styles.grid}>
        {data.map((day) => (
          <View
            key={day.date}
            style={[styles.dot, { backgroundColor: getDotColor(day.count) }]}
          />
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS.empty }]} />
          <Text style={styles.legendLabel}>none</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS.low }]} />
          <Text style={styles.legendLabel}>1</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS.mid }]} />
          <Text style={styles.legendLabel}>2</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: HEAT_COLORS.high }]} />
          <Text style={styles.legendLabel}>3+</Text>
        </View>
      </View>
    </View>
  );
}

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
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: DOT_GAP,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: 2,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
});

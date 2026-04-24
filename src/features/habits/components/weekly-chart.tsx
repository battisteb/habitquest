import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

interface WeeklyChartProps {
  data: { date: string; count: number }[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function WeeklyChart({ data }: WeeklyChartProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
  chart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
    gap: spacing.xs,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  barValue: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
  },
  barTrack: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  barFill: {
    width: '70%',
    borderRadius: 2,
    minWidth: 8,
  },
  dayLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
}), [themeKey]);
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>THIS WEEK</Text>
      <View style={styles.chart}>
        {data.map((day, i) => {
          const height = (day.count / maxCount) * 80;
          const dayOfWeek = new Date(day.date + 'T12:00:00').getDay();
          // Convert Sunday=0 to index, Mon=0
          const label = DAY_LABELS[(dayOfWeek + 6) % 7];

          return (
            <View key={day.date} style={styles.barContainer}>
              <Text style={styles.barValue}>{day.count > 0 ? day.count : ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: Math.max(height, day.count > 0 ? 4 : 0),
                      backgroundColor: day.count > 0 ? colors.success : colors.border,
                    },
                  ]}
                />
              </View>
              <Text style={styles.dayLabel}>{label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}



import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCategoryStats } from '../hooks/use-category-stats';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';
import { useT } from '../../../lib/i18n';
import { useTheme } from '../../../ui/theme/theme-context';

export function CategoryBreakdown() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    card: {
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
      marginBottom: 2,
    },
    row: {
      gap: 4,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    icon: {
      fontSize: 14,
    },
    label: {
      fontSize: fontSizes.xs,
      fontWeight: 'bold',
      color: colors.text,
      letterSpacing: 0.5,
    },
    meta: {
      fontSize: fontSizes.xs - 1,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 0.5,
    },
    barTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 3,
      minWidth: 4,
    },
  }), [themeKey]);

  const { stats, isLoading } = useCategoryStats();

  if (isLoading || stats.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{T.stats_section_categories}</Text>
      {stats.map((s) => (
        <View key={s.category} style={styles.row}>
          <View style={styles.rowHeader}>
            <View style={styles.rowLeft}>
              <Text style={styles.icon}>{s.icon}</Text>
              <Text style={styles.label}>{s.label.toUpperCase()}</Text>
            </View>
            <Text style={styles.meta}>
              {s.completions30d}/{s.maxPossible} · {s.rate}%
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(s.rate, 2)}%`,
                  backgroundColor: s.color,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

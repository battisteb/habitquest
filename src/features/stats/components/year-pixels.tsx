import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, type LayoutChangeEvent } from 'react-native';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT, lang$, localeTag, type Lang } from '../../../lib/i18n';
import { use$ } from '@legendapp/state/react';
import { rateLevel, type DayRate } from '../utils/stats-math';

/** Colors of the 5 levels (missed → all done), then "nothing due" and "locked". */
export const LEVEL_COLORS = ['#3a2d45', '#1a5c3a', '#22874f', '#2ecc71', '#4ecca3'];
export const EMPTY_COLOR = '#1d2036';
export const LOCKED_COLOR = '#14162a';

export function cellColor(day: DayRate | null, lockedBefore: string | null): string | null {
  if (!day) return null;
  if (lockedBefore && day.date < lockedBefore) return LOCKED_COLOR;
  const level = rateLevel(day.rate);
  return level < 0 ? EMPTY_COLOR : LEVEL_COLORS[level];
}

interface YearPixelsProps {
  weeks: (DayRate | null)[][];
  /** Days before this one (YYYY-MM-DD) are locked (free history limit). */
  lockedBefore: string | null;
  /** Fixed cell size (share card); otherwise the grid fits its width. */
  cell?: number;
  showLabels?: boolean;
  onLockedPress?: () => void;
}

/** The year as a pixel grid: one square per day, one column per week (Monday on top). */
export function YearPixels({ weeks, lockedBefore, cell: fixedCell, showLabels = true, onLockedPress }: YearPixelsProps) {
  const T = useT();
  const lang = use$(lang$);
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const [width, setWidth] = useState(0);
  const labelW = showLabels ? 14 : 0;
  const gap = 1;
  // Fractional sizes fill the width exactly; the squares stay crisp at 2-3x pixel ratios.
  const cell = fixedCell ?? Math.max(3, Math.floor(((width - labelW) / weeks.length - gap) * 10) / 10);

  const months = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(localeTag(lang as Lang), { month: 'short' });
    const out: { col: number; label: string }[] = [];
    weeks.forEach((col, i) => {
      const first = col[0];
      if (!first) return;
      const [y, m, d] = first.date.split('-').map(Number);
      if (d <= 7 && (out.length === 0 || i - out[out.length - 1].col > 2)) {
        out.push({ col: i, label: fmt.format(new Date(y, m - 1, d)).replace('.', '') });
      }
    });
    return out;
  }, [weeks, lang]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const ready = fixedCell !== undefined || width > 0;

  return (
    <View onLayout={fixedCell ? undefined : onLayout}>
      {ready && (
        <>
          {showLabels && (
            <View style={[styles.months, { marginLeft: labelW, height: 12 }]}>
              {months.map((m) => (
                <Text key={m.col} style={[styles.month, { left: m.col * (cell + gap) }]}>
                  {m.label}
                </Text>
              ))}
            </View>
          )}
          <View style={styles.row}>
            {showLabels && (
              <View style={{ width: labelW }}>
                {[T.day_mon, '', T.day_wed, '', T.day_fri, '', ''].map((d, i) => (
                  <Text key={i} style={[styles.dayLabel, { height: cell + gap, lineHeight: cell + gap }]}>
                    {d ? d[0] : ''}
                  </Text>
                ))}
              </View>
            )}
            {weeks.map((col, w) => (
              <View key={w} style={{ marginRight: gap }}>
                {col.map((day, i) => {
                  const color = cellColor(day, lockedBefore);
                  return (
                    <View
                      key={i}
                      style={{ width: cell, height: cell, marginBottom: gap, backgroundColor: color ?? 'transparent' }}
                    />
                  );
                })}
              </View>
            ))}
          </View>
          {lockedBefore && onLockedPress && (
            <Pressable onPress={onLockedPress} style={styles.lockBadge} accessibilityRole="button">
              <Text style={styles.lockText}>{T.stats_year_locked}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

/** "Less ■■■■■ More" legend. */
export function YearLegend() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  return (
    <View style={styles.legend}>
      <Text style={styles.legendText}>{T.stats_legend_less}</Text>
      {LEVEL_COLORS.map((c) => (
        <View key={c} style={[styles.legendCell, { backgroundColor: c }]} />
      ))}
      <Text style={styles.legendText}>{T.stats_legend_more}</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    months: { position: 'relative' },
    month: { position: 'absolute', top: 0, color: colors.textMuted, fontSize: pixelSize(8), fontFamily: fonts.bold },
    row: { flexDirection: 'row', marginTop: 2 },
    dayLabel: { color: colors.textMuted, fontSize: pixelSize(7), fontFamily: fonts.bold },
    lockBadge: {
      position: 'absolute',
      left: 22,
      top: 34,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.xp,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    lockText: { color: colors.xp, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
    legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
    legendCell: { width: 9, height: 9 },
    legendText: { color: colors.textMuted, fontSize: pixelSize(8), fontFamily: fonts.bold, marginHorizontal: 2 },
  });
}

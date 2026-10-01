import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { rateLevel, type DayRate } from '../utils/stats-math';
import { EMPTY_COLOR, LEVEL_COLORS, LOCKED_COLOR } from './year-pixels';

const WEEKDAY_KEYS = ['day_mon', 'day_tue', 'day_wed', 'day_thu', 'day_fri', 'day_sat', 'day_sun'] as const;

const pct = (r: number | null) => (r === null ? '–' : `${Math.round(r * 100)}%`);
const levelColor = (r: number | null) => (rateLevel(r) < 0 ? EMPTY_COLOR : LEVEL_COLORS[rateLevel(r)]);

/** The last 7 days as % bars, today outlined. */
export function WeekBars({ days, today }: { days: DayRate[]; today: string }) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  return (
    <View style={styles.bars} testID="stats-week">
      {days.map((d) => {
        const [y, m, day] = d.date.split('-').map(Number);
        const wd = (new Date(y, m - 1, day).getDay() + 6) % 7;
        const isToday = d.date === today;
        return (
          <View key={d.date} style={styles.barCol}>
            <Text style={[styles.barValue, isToday && styles.today]}>{pct(d.rate)}</Text>
            <View style={[styles.barTrack, isToday && styles.barTrackToday]}>
              <View
                style={{
                  width: '100%',
                  height: `${Math.max(d.rate ?? 0, 0.03) * 100}%`,
                  backgroundColor: d.rate === null ? EMPTY_COLOR : levelColor(d.rate),
                }}
              />
            </View>
            <Text style={[styles.barLabel, isToday && styles.today]}>
              {isToday ? T.stats_today : T[WEEKDAY_KEYS[wd]]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/** 12 weeks as columns of 10 pixel blocks (one block = 10 %), oldest left. */
export function TrendBlocks({ weeks, locked }: { weeks: (number | null)[]; locked: number }) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  return (
    <View>
      <View style={styles.trend} testID="stats-trend">
        {weeks.map((r, i) => {
          const isLocked = i < locked;
          const filled = r === null || isLocked ? 0 : Math.round(r * 10);
          return (
            <View key={i} style={styles.trendCol}>
              {Array.from({ length: 10 }, (_, b) => 9 - b).map((b) => (
                <View
                  key={b}
                  style={[
                    styles.block,
                    {
                      backgroundColor: isLocked ? LOCKED_COLOR : b < filled ? levelColor(r) : EMPTY_COLOR,
                      opacity: i === weeks.length - 1 || isLocked ? 1 : 0.85,
                    },
                  ]}
                />
              ))}
            </View>
          );
        })}
      </View>
      <View style={styles.trendLabels}>
        <Text style={styles.trendLabel}>{T.stats_trend_12w_ago}</Text>
        <Text style={styles.trendLabel}>{T.stats_trend_this_week}</Text>
      </View>
    </View>
  );
}

/** Small highlighted fact: "+12 pts vs last week", "Best day: Tuesday". */
export function Insight({ icon, value, label, tone = 'neutral' }: { icon: string; value: string; label: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const color = tone === 'good' ? colors.success : tone === 'bad' ? colors.danger : colors.xp;
  return (
    <View style={styles.insight}>
      <Text style={styles.insightIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[styles.insightValue, { color }]}>{value}</Text>
        <Text style={styles.insightLabel}>{label}</Text>
      </View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    bars: { flexDirection: 'row', gap: spacing.xs, height: 150, alignItems: 'flex-end' },
    barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' },
    barTrack: { width: '72%', height: 100, justifyContent: 'flex-end', backgroundColor: '#15172a' },
    barTrackToday: { borderWidth: 2, borderColor: colors.primary },
    barValue: { color: colors.textMuted, fontSize: pixelSize(9), fontFamily: fonts.bold },
    barLabel: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
    today: { color: colors.primary },
    trend: { flexDirection: 'row', gap: 4, justifyContent: 'space-between' },
    trendCol: { flex: 1, gap: 2 },
    block: { height: 7 },
    trendLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
    trendLabel: { color: colors.textMuted, fontSize: pixelSize(8), fontFamily: fonts.bold },
    insight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.sm,
    },
    insightIcon: { fontSize: 22 },
    insightValue: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold },
    insightLabel: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
  });
}

import { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { PixelAvatar, type PixelAvatarProps } from '../../avatar/renderer/pixel-avatar';
import type { DayRate } from '../utils/stats-math';
import { YearPixels, YearLegend } from './year-pixels';

/** Card size on screen; captured at 3x (1080×1350, Instagram portrait). */
export const CARD = { width: 360, height: 450 };

interface ShareCardProps {
  username: string;
  rank: string;
  look: Omit<PixelAvatarProps, 'size'>;
  bestStreak: number;
  rate30: number | null;
  total: number;
  weeks: (DayRate | null)[][];
  lockedBefore: string | null;
}

/** The image players post: their hero, three numbers and their year in pixels. */
export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { username, rank, look, bestStreak, rate30, total, weeks, lockedBefore },
  ref,
) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  return (
    <View ref={ref} collapsable={false} style={styles.card} testID="share-card">
      <View style={styles.header}>
        <Text style={styles.brand}>HABITQUEST</Text>
        <Text style={styles.handle}>@habitquest.app</Text>
      </View>

      <View style={styles.heroRow}>
        <PixelAvatar size={92} idleFrame={0} {...look} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name} numberOfLines={1}>{username}</Text>
          <Text style={styles.rank}>{rank}</Text>
        </View>
      </View>

      <View style={styles.numbers}>
        <Number value={`🔥${bestStreak}`} label={T.stats_share_best_streak} color={colors.streak} styles={styles} />
        <Number value={rate30 === null ? '–' : `${Math.round(rate30 * 100)}%`} label={T.stats_share_rate30} color={colors.xp} styles={styles} />
        <Number value={String(total)} label={T.stats_share_total} color={colors.success} styles={styles} />
      </View>

      <View style={styles.year}>
        <Text style={styles.yearTitle}>{T.stats_year_title}</Text>
        <YearPixels weeks={weeks} lockedBefore={lockedBefore} cell={5} showLabels={false} />
        <YearLegend />
      </View>

      <Text style={styles.site}>gethabitquest.com</Text>
    </View>
  );
});

function Number({ value, label, color, styles }: { value: string; label: string; color: string; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={styles.number}>
      <Text style={[styles.numberValue, { color }]}>{value}</Text>
      <Text style={styles.numberLabel}>{label}</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    card: {
      width: CARD.width,
      height: CARD.height,
      backgroundColor: '#0d0f1c',
      borderWidth: 4,
      borderColor: colors.primary,
      padding: spacing.md,
      justifyContent: 'space-between',
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    brand: { color: colors.text, fontSize: pixelSize(14), fontFamily: fonts.bold, letterSpacing: 2 },
    handle: { color: colors.textMuted, fontSize: pixelSize(9), fontFamily: fonts.bold },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    name: { color: colors.text, fontSize: pixelSize(16), fontFamily: fonts.bold },
    rank: { color: colors.xp, fontSize: pixelSize(10), fontFamily: fonts.bold, letterSpacing: 1 },
    numbers: { flexDirection: 'row', gap: spacing.xs },
    number: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      paddingVertical: spacing.sm,
      gap: 2,
    },
    numberValue: { fontSize: pixelSize(17), fontFamily: fonts.bold },
    numberLabel: { color: colors.textMuted, fontSize: pixelSize(7), fontFamily: fonts.bold, letterSpacing: 1, textAlign: 'center' },
    year: { gap: spacing.xs },
    site: { color: colors.primary, fontSize: pixelSize(10), fontFamily: fonts.bold, textAlign: 'center', letterSpacing: 1 },
    yearTitle: { color: colors.textSecondary, fontSize: pixelSize(9), fontFamily: fonts.bold, letterSpacing: 1 },
  });
}

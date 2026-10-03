import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useT, useLang, localeTag, type Lang } from '../../../lib/i18n';
import { projectLevelDate } from '../utils/rank-projection';
import { titleLabel, stageDescription } from '../../../lib/i18n/labels';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelProgress } from '../../../ui/components/pixel-progress';
import {
  AVATAR_STAGES,
  getAvatarStage,
  getAvatarStageIndex,
  getNextAvatarStage,
} from '../../avatar/utils/avatar-evolution';

interface RankCardProps {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  /** Progress to the next level, 0 to 1. */
  progress: number;
  /** XP earned over the last days, to show when the next rank comes at this pace. */
  recentXp?: number | null;
}

/**
 * Rank and level in one card. It changes with the rank: the frame and title
 * take the rank color, and the badge gains a pip per rank reached.
 */
export function RankCard({ level, currentXp, nextLevelXp, progress, recentXp }: RankCardProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const stage = getAvatarStage(level);
  const next = getNextAvatarStage(level);
  const index = getAvatarStageIndex(level);
  const lang = useLang();
  const eta = next && recentXp ? projectLevelDate(currentXp, next.minLevel, recentXp) : null;
  const styles = useMemo(() => createStyles(), [themeKey]);

  return (
    <PixelFrame borderColor={stage.aura} backgroundColor={colors.surface} contentStyle={[styles.card, { backgroundColor: stage.aura + '14' }]}>
      <View style={styles.row} testID="rank-card">
        {/* Badge: rank emblem in the rank color, one pip per rank reached */}
        <View style={styles.badgeCol}>
          <View style={[styles.badge, { borderColor: stage.aura, backgroundColor: stage.aura + '33' }]}>
            <Text style={styles.badgeEmoji}>{stage.emoji}</Text>
          </View>
          <View style={styles.pips}>
            {AVATAR_STAGES.slice(1).map((s, i) => (
              <View key={s.title} style={[styles.pip, { backgroundColor: i < index ? stage.aura : colors.border }]} />
            ))}
          </View>
        </View>

        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: stage.aura }]} numberOfLines={1}>
              {titleLabel(T, stage.title).toUpperCase()}
            </Text>
            <Text style={styles.level}>
              {T.xp_level_prefix} {level}
            </Text>
          </View>
          <Text style={styles.description}>{stageDescription(T, stage.title, stage.description)}</Text>
        </View>
      </View>

      <PixelProgress progress={progress} color={stage.aura} />
      <View style={styles.footer}>
        <Text style={styles.next} numberOfLines={1}>
          {next
            ? T.profile_next_stage.replace('{title}', titleLabel(T, next.title)).replace('{level}', String(next.minLevel))
            : T.profile_max_rank}
        </Text>
        <Text style={styles.xp}>
          {currentXp} / {nextLevelXp} XP
        </Text>
      </View>
      {eta && next && (
        <Text style={[styles.eta, { color: next.aura }]} testID="rank-eta">
          {T.profile_rank_eta
            .replace('{title}', titleLabel(T, next.title))
            .replace('{date}', eta.toLocaleDateString(localeTag(lang as Lang), { day: 'numeric', month: 'long' }))}
        </Text>
      )}
    </PixelFrame>
  );
}

function createStyles() {
  return StyleSheet.create({
    card: { padding: spacing.md, gap: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    badgeCol: { alignItems: 'center', gap: 4 },
    badge: {
      width: 52,
      height: 52,
      borderWidth: 3,
      borderRadius: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeEmoji: { fontSize: 26 },
    pips: { flexDirection: 'row', gap: 2 },
    pip: { width: 6, height: 6, borderRadius: 0 },
    info: { flex: 1, gap: 2 },
    titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm },
    title: { fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold, letterSpacing: 2, flexShrink: 1 },
    level: { fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold, color: colors.xp, letterSpacing: 1 },
    description: { fontSize: fontSizes.sm, color: colors.textSecondary },
    footer: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
    next: { flex: 1, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 1 },
    eta: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
    xp: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 0.5 },
  });
}

import { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useT, useLang, localeTag, type Lang } from '../../../lib/i18n';
import { projectLevelDate } from '../utils/rank-projection';
import { titleLabel, stageDescription } from '../../../lib/i18n/labels';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelProgress } from '../../../ui/components/pixel-progress';
import { XP_CONFIG, calculateXpEarned, getXpForLevel } from '../../../lib/constants/game-config';
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
  /**
   * Best streak still running. When given, the card unfolds to show the
   * streak bonus and the road through the ranks (D8: former XP journey screen).
   */
  bestStreak?: number;
}

/**
 * Rank and level in one card. It changes with the rank: the frame and title
 * take the rank color, and the badge gains a pip per rank reached. With a
 * best streak, a tap unfolds the streak bonus and the road through the ranks.
 */
export function RankCard({ level, currentXp, nextLevelXp, progress, recentXp, bestStreak }: RankCardProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const stage = getAvatarStage(level);
  const next = getNextAvatarStage(level);
  const index = getAvatarStageIndex(level);
  const lang = useLang();
  const eta = next && recentXp ? projectLevelDate(currentXp, next.minLevel, recentXp) : null;
  const styles = useMemo(() => createStyles(), [themeKey]);
  const [open, setOpen] = useState(false);
  const expandable = bestStreak !== undefined;
  // Bonus of the next validation of that quest (its streak goes up by one).
  const multiplier = Math.min(
    1 + ((bestStreak ?? 0) + 1) * XP_CONFIG.STREAK_MULTIPLIER_STEP,
    XP_CONFIG.STREAK_MULTIPLIER_CAP,
  );

  const card = (
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
      {expandable && (
        <Text style={styles.toggle}>{open ? T.rank_details_hide : T.rank_details_show}</Text>
      )}
      {expandable && open && (
        <View style={styles.details} testID="rank-details">
          {/* Streak bonus: the longer the streak, the more XP per quest. */}
          <Text style={styles.detailsTitle}>{T.xp_section_streak_bonus}</Text>
          <Text style={styles.bonusLine}>
            🔥 {bestStreak} → ×{multiplier.toFixed(1)} → {calculateXpEarned((bestStreak ?? 0) + 1)} XP
          </Text>
          <Text style={styles.hint}>
            {T.xp_multiplier_hint
              .replace('{max}', String(XP_CONFIG.STREAK_MULTIPLIER_CAP))
              .replace('{threshold}', String(Math.round((XP_CONFIG.STREAK_MULTIPLIER_CAP - 1) / XP_CONFIG.STREAK_MULTIPLIER_STEP)))}
          </Text>

          {/* The road through the ranks. */}
          <Text style={styles.detailsTitle}>{T.xp_section_roadmap}</Text>
          {AVATAR_STAGES.map((s) => {
            const reached = level >= s.minLevel;
            const current = s.title === stage.title;
            return (
              <View key={s.title} style={styles.roadRow}>
                <View style={[styles.roadDot, { backgroundColor: reached ? s.aura : colors.border }]} />
                <Text style={[styles.roadName, { color: reached ? s.aura : colors.textMuted }]}>
                  {titleLabel(T, s.title)} {current ? T.xp_roadmap_you : ''}
                </Text>
                <Text style={styles.roadReq}>
                  {T.xp_roadmap_req.replace('{level}', String(s.minLevel)).replace('{xp}', getXpForLevel(s.minLevel).toLocaleString())}
                </Text>
                {reached && !current ? <Text style={[styles.roadCheck, { color: s.aura }]}>✓</Text> : null}
              </View>
            );
          })}
        </View>
      )}
    </PixelFrame>
  );

  if (!expandable) return card;
  return (
    <Pressable
      onPress={() => setOpen((v) => !v)}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      testID="rank-card-toggle"
    >
      {card}
    </Pressable>
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
    toggle: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.primary, letterSpacing: 1, textAlign: 'center' },
    details: { gap: spacing.xs, borderTopWidth: 2, borderTopColor: colors.border, paddingTop: spacing.sm },
    detailsTitle: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 1, marginTop: spacing.xs },
    bonusLine: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.xp },
    hint: { fontSize: fontSizes.xs, color: colors.textMuted },
    roadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    roadDot: { width: 10, height: 10 },
    roadName: { flex: 1, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
    roadReq: { fontSize: fontSizes.xs, color: colors.textMuted },
    roadCheck: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, width: 14, textAlign: 'center' },
  });
}

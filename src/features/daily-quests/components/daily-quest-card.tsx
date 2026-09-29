import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSizes, borderRadius, fonts, pixelSize } from '../../../ui/theme/tokens';
import type { DailyQuestWithTemplate, QuestDifficulty } from '../stores/daily-quests-store';
import { useTheme } from '../../../ui/theme/theme-context';
import { useLang, useT } from '../../../lib/i18n';
import { questText } from '../../../lib/i18n/content';
import { PixelFrame, shade } from '../../../ui/components/pixel-frame';
import { PixelProgress } from '../../../ui/components/pixel-progress';

interface DailyQuestCardProps {
  quest: DailyQuestWithTemplate;
  onClaim: (questId: string) => void;
  isPaused?: boolean;
}

const DIFFICULTY_COLORS: Record<QuestDifficulty, string> = {
  easy: colors.success,
  normal: '#5b8def',
  hard: '#9b59b6',
};

export function DailyQuestCard({ quest, onClaim, isPaused = false }: DailyQuestCardProps) {
  const T = useT();
  const lang = useLang();
  const { themeKey } = useTheme();
  const DIFFICULTY_LABELS = useMemo<Record<QuestDifficulty, string>>(
    () => ({ easy: T.dq_diff_easy, normal: T.dq_diff_normal, hard: T.dq_diff_hard }),
    [T],
  );
  const styles = useMemo(() => StyleSheet.create({
  // Flat inside the gold missions frame (DailyQuestsSection).
  card: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  cardClaimed: {
    opacity: 0.6,
  },
  cardPaused: {
    opacity: 0.45,
    borderColor: '#4FC3F7',
  },
  pausedBadge: {
    backgroundColor: '#4FC3F7' + '22',
    borderRadius: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pausedBadgeText: {
    color: '#4FC3F7',
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  difficultyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
  },
  difficultyText: {
    color: colors.text,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  rewards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  xpReward: {
    color: colors.xp,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
  },
  goldReward: {
    color: colors.accent,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
  },
  title: {
    color: colors.text,
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
  },
  description: {
    color: colors.textSecondary,
    fontSize: fontSizes.sm,
  },
  textClaimed: {
    color: colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    minWidth: 32,
    textAlign: 'right',
  },
  claimButton: {
    marginTop: spacing.xs,
  },
  claimFace: {
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#1a1a2e',
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
}), [themeKey]);
  const { template } = quest;
  const difficultyColor = DIFFICULTY_COLORS[template.difficulty];
  const progress = Math.min(quest.current_progress, template.target_value);
  const progressPercent = template.target_value > 0
    ? Math.min((progress / template.target_value) * 100, 100)
    : 0;

  const isClaimed = quest.is_claimed;
  const isCompleted = quest.is_completed;
  const canClaim = isCompleted && !isClaimed;

  return (
    <View style={[styles.card, isClaimed && styles.cardClaimed, isPaused && styles.cardPaused]}>
      {/* Paused mode badge */}
      {isPaused && (
        <View style={styles.pausedBadge}>
          <Text style={styles.pausedBadgeText}>{T.dq_paused_label}</Text>
        </View>
      )}

      {/* Header row: difficulty badge + rewards */}
      <View style={styles.headerRow}>
        <View style={[styles.difficultyBadge, { backgroundColor: difficultyColor }]}>
          <Text style={styles.difficultyText}>
            {DIFFICULTY_LABELS[template.difficulty]}
          </Text>
        </View>
        <View style={styles.rewards}>
          <Text style={styles.xpReward}>{template.xp_reward} XP</Text>
          <Text style={styles.goldReward}>{template.gold_reward} G</Text>
        </View>
      </View>

      {/* Title and description */}
      <Text style={[styles.title, isClaimed && styles.textClaimed]}>
        {isClaimed ? '\u2713 ' : ''}{questText(lang, template).title}
      </Text>
      <Text style={[styles.description, isClaimed && styles.textClaimed]}>
        {questText(lang, template).description}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <PixelProgress
            progress={progressPercent / 100}
            segments={10}
            height={6}
            color={isClaimed ? colors.textMuted : isCompleted ? colors.success : difficultyColor}
          />
        </View>
        <Text style={styles.progressText}>
          {progress}/{template.target_value}
        </Text>
      </View>

      {/* Claim button */}
      {canClaim && (
        <Pressable
          testID="claim-button"
          style={styles.claimButton}
          onPress={() => onClaim(quest.id)}
        >
          {({ pressed }) => (
            <PixelFrame
              pressed={pressed}
              borderColor={shade(colors.accent, 0.75)}
              backgroundColor={colors.accent}
              contentStyle={styles.claimFace}
            >
              <Text style={styles.claimButtonText}>{T.dq_claim_btn}</Text>
            </PixelFrame>
          )}
        </Pressable>
      )}
    </View>
  );
}



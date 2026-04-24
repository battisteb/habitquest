import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import type { DailyQuestWithTemplate, QuestDifficulty } from '../stores/daily-quests-store';
import { useTheme } from '../../../ui/theme/theme-context';

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

const DIFFICULTY_LABELS: Record<QuestDifficulty, string> = {
  easy: 'EASY',
  normal: 'NORMAL',
  hard: 'HARD',
};

export function DailyQuestCard({ quest, onClaim, isPaused = false }: DailyQuestCardProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 4,
    borderRadius: borderRadius.sm,
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
    borderRadius: 3,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  pausedBadgeText: {
    color: '#4FC3F7',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
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
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  rewards: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  xpReward: {
    color: colors.xp,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  goldReward: {
    color: colors.accent,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
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
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    minWidth: 32,
    textAlign: 'right',
  },
  claimButton: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: '#c9a400',
    borderBottomWidth: 4,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs + 2,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  claimButtonPressed: {
    borderBottomWidth: 2,
    marginTop: spacing.xs + 2,
  },
  claimButtonText: {
    color: colors.background,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
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
          <Text style={styles.pausedBadgeText}>❄️ PAUSED BY FOCUS MODE</Text>
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
        {isClaimed ? '\u2713 ' : ''}{template.title}
      </Text>
      <Text style={[styles.description, isClaimed && styles.textClaimed]}>
        {template.description}
      </Text>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${progressPercent}%`,
                backgroundColor: isClaimed
                  ? colors.textMuted
                  : isCompleted
                    ? colors.success
                    : difficultyColor,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {progress}/{template.target_value}
        </Text>
      </View>

      {/* Claim button */}
      {canClaim && (
        <Pressable
          style={({ pressed }) => [
            styles.claimButton,
            pressed && styles.claimButtonPressed,
          ]}
          onPress={() => onClaim(quest.id)}
        >
          <Text style={styles.claimButtonText}>CLAIM</Text>
        </Pressable>
      )}
    </View>
  );
}



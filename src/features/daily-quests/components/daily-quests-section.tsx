import { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import { useDailyQuests } from '../hooks/use-daily-quests';
import { DailyQuestCard } from './daily-quest-card';

interface DailyQuestsSectionProps {
  pausedCategories?: string[];
}

export function DailyQuestsSection({ pausedCategories = [] }: DailyQuestsSectionProps) {
  const { quests, isLoading, fetchDailyQuests, claimQuest } = useDailyQuests();

  useEffect(() => {
    fetchDailyQuests();
  }, []);

  const handleClaim = useCallback(async (questId: string) => {
    try {
      await claimQuest(questId);
    } catch {
      // Silently handle claim errors; user can retry
    }
  }, []);

  const completedCount = quests.filter((q) => q.is_claimed).length;
  const totalCount = quests.length;

  if (isLoading && quests.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>DAILY QUESTS</Text>
        </View>
        <ActivityIndicator color={colors.accent} size="small" />
      </View>
    );
  }

  if (quests.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>DAILY QUESTS</Text>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {completedCount}/{totalCount}
            </Text>
          </View>
        </View>
        <Text style={styles.refreshHint}>Resets daily</Text>
      </View>
      <View style={styles.questList}>
        {quests.map((quest) => {
          const isPaused =
            quest.template.quest_type === 'complete_category' &&
            quest.template.target_category != null &&
            pausedCategories.includes(quest.template.target_category);
          return (
            <DailyQuestCard
              key={quest.id}
              quest={quest}
              onClaim={handleClaim}
              isPaused={isPaused}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    color: colors.accent,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  counterBadge: {
    backgroundColor: colors.surfaceLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  counterText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
  },
  refreshHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
  },
  questList: {
    gap: spacing.sm,
  },
});

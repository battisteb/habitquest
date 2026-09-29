import { useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useDailyQuests } from '../hooks/use-daily-quests';
import { DailyQuestCard } from './daily-quest-card';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { hapticMedium } from '../../../lib/haptics';
import { PixelFrame } from '../../../ui/components/pixel-frame';

interface DailyQuestsSectionProps {
  pausedCategories?: string[];
}

export function DailyQuestsSection({ pausedCategories = [] }: DailyQuestsSectionProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
  headerTitle: {
    color: colors.accent,
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  refreshHint: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  banner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  bannerTitle: {
    color: '#1a1a2e',
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  questList: {
    gap: spacing.sm,
    padding: spacing.sm,
  },
}), [themeKey]);
  const { quests, isLoading, fetchDailyQuests, claimQuest } = useDailyQuests();

  useEffect(() => {
    fetchDailyQuests();
  }, []);

  const handleClaim = useCallback(async (questId: string) => {
    hapticMedium();
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
          <Text style={styles.headerTitle}>{T.dq_section_title}</Text>
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
      {/* Gold frame: the daily missions are the "treasure" of the day. */}
      <PixelFrame borderColor={colors.accent} backgroundColor={colors.surface}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>{T.dq_section_title}</Text>
        <Text style={styles.bannerTitle}>
          {completedCount}/{totalCount}
        </Text>
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
        <Text style={styles.refreshHint}>{T.dq_section_reset_hint}</Text>
      </View>
      </PixelFrame>
    </View>
  );
}



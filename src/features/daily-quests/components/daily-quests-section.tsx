import { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { PixelProgress } from '../../../ui/components/pixel-progress';
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
  bannerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  claimBadge: {
    color: colors.text,
    backgroundColor: colors.success,
    paddingHorizontal: spacing.xs + 2,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
  collapsedProgress: { padding: spacing.xs + 2 },
  questList: {
    gap: spacing.sm,
    padding: spacing.sm,
  },
}), [themeKey]);
  const { quests, isLoading, fetchDailyQuests, claimQuest } = useDailyQuests();
  const [expanded, setExpanded] = useState(false);

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

  const claimable = quests.filter((q) => q.is_completed && !q.is_claimed).length;

  return (
    <View style={styles.container}>
      {/* Gold frame: the daily missions are the "treasure" of the day. Folded
          into a one-line banner so they sit above the habits without hiding them. */}
      <PixelFrame borderColor={colors.accent} backgroundColor={colors.surface}>
      <Pressable
        testID="missions-banner"
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? T.dq_collapse_a11y : T.dq_expand_a11y}
        style={styles.banner}
      >
        <Text style={styles.bannerTitle}>{T.dq_section_title}</Text>
        <View style={styles.bannerRight}>
          {claimable > 0 && !expanded && (
            <Text style={styles.claimBadge}>{T.dq_to_claim.replace('{n}', String(claimable))}</Text>
          )}
          <Text style={styles.bannerTitle}>
            {completedCount}/{totalCount} {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </Pressable>
      {!expanded && (
        <View style={styles.collapsedProgress}>
          <PixelProgress progress={totalCount ? completedCount / totalCount : 0} segments={Math.max(totalCount, 1)} height={6} color={colors.accent} />
        </View>
      )}
      {expanded && (
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
      )}
      </PixelFrame>
    </View>
  );
}



import { use$ } from '@legendapp/state/react';
import { dailyQuestsStore$, chestReady, openChest } from '../stores/daily-quests-store';
import { PixelButton } from '../../../ui/components/pixel-button';
import { showDialog } from '../../../lib/app-alert';
import { useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from 'react-native';
import { PixelProgress } from '../../../ui/components/pixel-progress';
import { useTourTarget, emitTourEvent } from '../../onboarding/tour/tour-targets';
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
  const chestOpenedOn = use$(dailyQuestsStore$.chestOpenedOn);
  const [expanded, setExpanded] = useState(false);
  const tourTarget = useTourTarget('missions');

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
  const canOpenChest = chestReady(quests, chestOpenedOn);
  const handleOpenChest = async () => {
    hapticMedium();
    const r = await openChest();
    if (!r?.success) return;
    const reward = r.jackpot
      ? T.dq_chest_jackpot.replace('{n}', String(r.gold))
      : r.gold
        ? T.dq_chest_gold.replace('{n}', String(r.gold))
        : T.dq_chest_xp.replace('{n}', String(r.xp));
    showDialog(T.dq_chest_title, reward);
  };

  return (
    <View style={styles.container}>
      {/* Gold frame: the daily missions are the "treasure" of the day. Folded
          into a one-line banner so they sit above the habits without hiding them. */}
      <PixelFrame borderColor={colors.accent} backgroundColor={colors.surface}>
      <View {...tourTarget}>
      <Pressable
        testID="missions-banner"
        onPress={() => {
          setExpanded((e) => !e);
          emitTourEvent('missions_toggled');
        }}
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
          {canOpenChest && !expanded && <Text style={styles.claimBadge}>{T.dq_chest_ready}</Text>}
          <Text style={styles.bannerTitle}>
            {completedCount}/{totalCount} {expanded ? '▲' : '▼'}
          </Text>
        </View>
      </Pressable>
      </View>
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
        {/* Mission chest (G7): once the three missions are claimed. */}
        {canOpenChest && (
          <PixelButton title={T.dq_chest_open} onPress={handleOpenChest} testID="open-chest" />
        )}
        <Text style={styles.refreshHint}>{T.dq_section_reset_hint}</Text>
      </View>
      )}
      </PixelFrame>
    </View>
  );
}



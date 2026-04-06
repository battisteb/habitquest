import { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { HabitTimer } from '../../src/features/habits/components/habit-timer';
import { HabitChecklist } from '../../src/features/habits/components/habit-checklist';
import { habitsStore$, archiveHabit, completeHabit, pauseHabit, resumeHabit } from '../../src/features/habits/stores/habits-store';
import { useDynamicGoal } from '../../src/features/habits/hooks/use-dynamic-goal';
import { CONTENT_TYPE_CONFIG } from '../../src/features/habits/types/habit-content';
import { getCategoryColor } from '../../src/lib/constants/categories';
import { colors, spacing, fontSizes } from '../../src/ui/theme/tokens';
import type { HabitContent } from '../../src/features/habits/types/habit-content';

export default function HabitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const todayCompletions = use$(habitsStore$.todayCompletions);
  const [contentExpanded, setContentExpanded] = useState(false);

  const habit = habits.find((h) => h.id === id);
  const streak = id ? streaks[id] : undefined;
  const isCompletedToday = id ? !!todayCompletions[id] : false;
  const content = habit?.content as HabitContent | null | undefined;
  const streakCount = id ? (streaks[id]?.current_count ?? 0) : 0;
  const goalSuggestion = useDynamicGoal(habit?.id ?? '', streakCount);

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>Habit not found</Text>
      </View>
    );
  }

  const isPaused = !!(habit as any).is_paused;

  const handleArchive = () => {
    Alert.alert('Archive quest', `Remove "${habit.name}" from your active quests?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          await archiveHabit(habit.id);
          router.back();
        },
      },
    ]);
  };

  const handlePauseResume = () => {
    if (isPaused) {
      Alert.alert('Resume Quest', `Resume "${habit.name}"? Streak tracking will restart.`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resume', onPress: () => resumeHabit(habit.id) },
      ]);
    } else {
      Alert.alert(
        'Pause Quest',
        `Pause "${habit.name}"? Your streak is preserved — you won't be penalised while paused.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pause', onPress: () => pauseHabit(habit.id) },
        ],
      );
    }
  };

  const handleComplete = async () => {
    await completeHabit(habit.id);
    setContentExpanded(false);
  };

  const handleLinkOpen = async () => {
    if (content?.type !== 'link') return;
    const url = content.url.startsWith('http') ? content.url : `https://${content.url}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Cannot open link', url);
    }
  };

  const categoryColor = getCategoryColor(habit.category);

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.category, { color: categoryColor }]}>
          {habit.category.toUpperCase()}
        </Text>
        <Text style={styles.title}>{habit.name}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.streak }]}>
            {streak?.current_count ?? 0}
          </Text>
          <Text style={styles.statLabel}>STREAK</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {streak?.longest_count ?? 0}
          </Text>
          <Text style={styles.statLabel}>BEST</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: isCompletedToday ? colors.success : colors.textMuted }]}>
            {isCompletedToday ? '✓' : '—'}
          </Text>
          <Text style={styles.statLabel}>TODAY</Text>
        </View>
      </View>

      {/* Content section */}
      {content && (
        <View style={styles.contentSection}>
          <Pressable
            style={styles.contentHeader}
            onPress={() => setContentExpanded((e) => !e)}
          >
            <View style={styles.contentHeaderLeft}>
              <Text style={styles.contentIcon}>
                {CONTENT_TYPE_CONFIG[content.type].icon}
              </Text>
              <View>
                <Text style={styles.contentType}>
                  {CONTENT_TYPE_CONFIG[content.type].label.toUpperCase()}
                </Text>
                <Text style={styles.contentSubtitle} numberOfLines={1}>
                  {content.type === 'timer' && `${content.label} — ${Math.floor(content.duration / 60)}min${content.duration % 60 > 0 ? ` ${content.duration % 60}s` : ''}`}
                  {content.type === 'checklist' && `${content.items.length} steps`}
                  {content.type === 'link' && content.label}
                </Text>
              </View>
            </View>
            <Text style={styles.expandChevron}>{contentExpanded ? '▲' : '▼'}</Text>
          </Pressable>

          {contentExpanded && (
            <View style={styles.contentBody}>
              {content.type === 'timer' && (
                <HabitTimer
                  duration={content.duration}
                  label={content.label}
                  onComplete={isCompletedToday ? () => {} : handleComplete}
                />
              )}
              {content.type === 'checklist' && (
                <HabitChecklist
                  items={content.items}
                  onComplete={isCompletedToday ? () => {} : handleComplete}
                />
              )}
              {content.type === 'link' && (
                <View style={styles.linkContent}>
                  <Text style={styles.linkUrl} numberOfLines={2}>{content.url}</Text>
                  <PixelButton
                    title={`Open: ${content.label}`}
                    onPress={handleLinkOpen}
                    variant="secondary"
                  />
                  {!isCompletedToday && (
                    <PixelButton
                      title="Mark as done"
                      onPress={handleComplete}
                    />
                  )}
                </View>
              )}
              {isCompletedToday && (
                <Text style={styles.alreadyDone}>Already completed today ✓</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Quick complete (no content, or no content set) */}
      {!content && !isCompletedToday && (
        <PixelButton
          title="Mark as done"
          onPress={handleComplete}
          style={styles.quickComplete}
        />
      )}

      {/* Dynamic goal suggestion */}
      {goalSuggestion.type !== 'none' && (
        <View style={[
          styles.goalCard,
          goalSuggestion.type === 'level_up' && styles.goalCardLevelUp,
          goalSuggestion.type === 'restart' && styles.goalCardRestart,
        ]}>
          <Text style={styles.goalMessage}>{goalSuggestion.message}</Text>
          <Text style={styles.goalDetail}>{goalSuggestion.detail}</Text>
        </View>
      )}

      {isPaused && (
        <View style={styles.pausedBanner}>
          <Text style={styles.pausedText}>❄️ PAUSED — streak protected</Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <PixelButton
          title="Edit"
          onPress={() => router.push(`/habit/edit/${habit.id}`)}
          variant="ghost"
          style={{ flex: 1 }}
        />
        <PixelButton
          title={isPaused ? '▶ Resume' : '⏸ Pause'}
          onPress={handlePauseResume}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <PixelButton
          title="Archive"
          onPress={handleArchive}
          variant="ghost"
          style={{ flex: 1 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  category: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  contentSection: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  contentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  contentIcon: {
    fontSize: 28,
  },
  contentType: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  contentSubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  expandChevron: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    marginLeft: spacing.sm,
  },
  contentBody: {
    borderTopWidth: 2,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  linkContent: {
    gap: spacing.md,
  },
  linkUrl: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
  },
  alreadyDone: {
    color: colors.success,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  goalCard: {
    backgroundColor: colors.xp + '18',
    borderWidth: 2,
    borderColor: colors.xp + '66',
    borderRadius: 4,
    padding: spacing.md,
    gap: 4,
  },
  goalCardLevelUp: {
    backgroundColor: colors.accent + '18',
    borderColor: colors.accent + '88',
  },
  goalCardRestart: {
    backgroundColor: colors.success + '18',
    borderColor: colors.success + '88',
  },
  goalMessage: {
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  goalDetail: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  pausedBanner: {
    backgroundColor: '#4FC3F7' + '22',
    borderWidth: 2,
    borderColor: '#4FC3F7',
    borderRadius: 4,
    padding: spacing.sm,
    alignItems: 'center',
  },
  pausedText: {
    color: '#4FC3F7',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  quickComplete: {
    marginTop: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
});

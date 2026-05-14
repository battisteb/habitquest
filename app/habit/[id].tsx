import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView, Pressable, Linking, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { HabitTimer } from '../../src/features/habits/components/habit-timer';
import { HabitChecklist } from '../../src/features/habits/components/habit-checklist';
import { CompletionNoteModal } from '../../src/features/habits/components/completion-note-modal';
import { habitsStore$, archiveHabit, completeHabit, pauseHabit, resumeHabit } from '../../src/features/habits/stores/habits-store';
import { MonthlyHeatmap } from '../../src/features/habits/components/monthly-heatmap';
import { useDynamicGoal } from '../../src/features/habits/hooks/use-dynamic-goal';
import { CONTENT_TYPE_CONFIG } from '../../src/features/habits/types/habit-content';
import { getCategoryColor } from '../../src/lib/constants/categories';
import { colors, spacing, fontSizes } from '../../src/ui/theme/tokens';
import {
  getHabitReminder,
  scheduleHabitReminder,
  cancelHabitReminder,
  HabitReminder,
} from '../../src/features/notifications/utils/notification-service';
import type { HabitContent } from '../../src/features/habits/types/habit-content';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';

export default function HabitDetailScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  reminderLabel: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
  reminderValue: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 2,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  hourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  hourBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  hourBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '33',
  },
  hourBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  hourBtnTextActive: {
    color: colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  bottomRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    marginBottom: spacing.lg,
  },
}), [themeKey]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const todayCompletions = use$(habitsStore$.todayCompletions);
  const [contentExpanded, setContentExpanded] = useState(false);
  const [reminder, setReminder] = useState<HabitReminder | null>(() =>
    id ? getHabitReminder(id) : null,
  );
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);

  const habit = habits.find((h) => h.id === id);
  const streak = id ? streaks[id] : undefined;
  const isCompletedToday = id ? !!todayCompletions[id] : false;
  const content = habit?.content as HabitContent | null | undefined;
  const streakCount = id ? (streaks[id]?.current_count ?? 0) : 0;
  const goalSuggestion = useDynamicGoal(habit?.id ?? '', streakCount);

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{T.habit_detail_not_found}</Text>
      </View>
    );
  }

  const isPaused = !!(habit as any).is_paused;

  const handleArchive = () => {
    Alert.alert(
      T.habit_detail_archive_title,
      T.habit_detail_archive_msg.replace('{name}', habit.name),
      [
        { text: T.common_cancel, style: 'cancel' },
        {
          text: T.habit_detail_archive_confirm,
          style: 'destructive',
          onPress: async () => {
            await archiveHabit(habit.id);
            router.back();
          },
        },
      ],
    );
  };

  const handlePauseResume = () => {
    if (isPaused) {
      Alert.alert(
        T.habit_detail_resume_title,
        T.habit_detail_resume_msg.replace('{name}', habit.name),
        [
          { text: T.common_cancel, style: 'cancel' },
          { text: T.habit_detail_resume_confirm, onPress: () => resumeHabit(habit.id) },
        ],
      );
    } else {
      Alert.alert(
        T.habit_detail_pause_title,
        T.habit_detail_pause_msg.replace('{name}', habit.name),
        [
          { text: T.common_cancel, style: 'cancel' },
          { text: T.habit_detail_pause_confirm, onPress: () => pauseHabit(habit.id) },
        ],
      );
    }
  };

  const handleComplete = () => {
    setPendingComplete(true);
    setShowNoteModal(true);
    setContentExpanded(false);
  };

  const handleNoteSave = async (note: string) => {
    setShowNoteModal(false);
    if (pendingComplete) {
      await completeHabit(habit.id, note || undefined);
      setPendingComplete(false);
    }
  };

  const handleNoteSkip = async () => {
    setShowNoteModal(false);
    if (pendingComplete) {
      await completeHabit(habit.id);
      setPendingComplete(false);
    }
  };

  const handleLinkOpen = async () => {
    if (content?.type !== 'link') return;
    const url = content.url.startsWith('http') ? content.url : `https://${content.url}`;
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert(T.habit_detail_link_cant_open, url);
    }
  };

  const categoryColor = getCategoryColor(habit.category);

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title={T.common_back} onPress={() => router.back()} variant="ghost" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.category, { color: categoryColor }]}>
          {habit.category.toUpperCase()}
        </Text>
        <Text style={styles.title}>
          {(habit as any).emoji ? `${(habit as any).emoji} ` : ''}{habit.name}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.streak }]}>
            {streak?.current_count ?? 0}
          </Text>
          <Text style={styles.statLabel}>{T.habit_detail_stat_streak}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accent }]}>
            {streak?.longest_count ?? 0}
          </Text>
          <Text style={styles.statLabel}>{T.habit_detail_stat_best}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: isCompletedToday ? colors.success : colors.textMuted }]}>
            {isCompletedToday ? '✓' : '—'}
          </Text>
          <Text style={styles.statLabel}>{T.habit_detail_stat_today}</Text>
        </View>
      </View>

      <MonthlyHeatmap habitId={habit.id} />

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
                  {content.type === 'checklist' && T.habit_detail_steps.replace('{n}', String(content.items.length))}
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
                    title={T.habit_detail_open_link.replace('{label}', content.label)}
                    onPress={handleLinkOpen}
                    variant="secondary"
                  />
                  {!isCompletedToday && (
                    <PixelButton
                      title={T.habit_detail_mark_done}
                      onPress={handleComplete}
                    />
                  )}
                </View>
              )}
              {isCompletedToday && (
                <Text style={styles.alreadyDone}>{T.habit_detail_already_done}</Text>
              )}
            </View>
          )}
        </View>
      )}

      {/* Quick complete (no content, or no content set) */}
      {!content && !isCompletedToday && (
        <PixelButton
          title={T.habit_detail_mark_done}
          onPress={handleComplete}
          style={styles.quickComplete}
        />
      )}

      {/* Dynamic goal suggestion */}
      {goalSuggestion.type !== 'none' && (() => {
        const n = String(goalSuggestion.completions);
        const total = String(goalSuggestion.total);
        const msgKey = goalSuggestion.type === 'level_up' ? 'goal_level_up_msg'
          : goalSuggestion.type === 'restart' ? 'goal_restart_msg'
          : 'goal_keep_going_msg';
        const detailKey = goalSuggestion.type === 'level_up' ? 'goal_level_up_detail'
          : goalSuggestion.type === 'restart' ? 'goal_restart_detail'
          : 'goal_keep_going_detail';
        return (
          <View style={[
            styles.goalCard,
            goalSuggestion.type === 'level_up' && styles.goalCardLevelUp,
            goalSuggestion.type === 'restart' && styles.goalCardRestart,
          ]}>
            <Text style={styles.goalMessage}>{T[msgKey]}</Text>
            <Text style={styles.goalDetail}>
              {T[detailKey].replace('{n}', n).replace('{total}', total)}
            </Text>
          </View>
        );
      })()}

      {isPaused && (
        <View style={styles.pausedBanner}>
          <Text style={styles.pausedText}>{T.habit_detail_paused}</Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <PixelButton
          title={T.habit_detail_btn_edit}
          onPress={() => router.push(`/habit/edit/${habit.id}`)}
          variant="ghost"
          style={{ flex: 1 }}
        />
        <PixelButton
          title={isPaused ? T.habit_detail_btn_resume : T.habit_detail_btn_pause}
          onPress={handlePauseResume}
          variant="secondary"
          style={{ flex: 1 }}
        />
        <PixelButton
          title={T.habit_detail_btn_archive}
          onPress={handleArchive}
          variant="ghost"
          style={{ flex: 1 }}
        />
      </View>
      {/* Reminder */}
      <Pressable
        style={styles.reminderRow}
        onPress={() => setShowReminderPicker(true)}
      >
        <Text style={styles.reminderLabel}>{T.habit_detail_reminder}</Text>
        <Text style={[styles.reminderValue, reminder && { color: colors.primary }]}>
          {reminder ? `${String(reminder.hour).padStart(2, '0')}:${String(reminder.minute).padStart(2, '0')}` : T.habit_detail_reminder_off}
        </Text>
      </Pressable>

      <PixelButton
        title={T.habit_detail_btn_history}
        onPress={() => router.push({ pathname: '/habit/history', params: { habitId: habit.id, habitName: habit.name } })}
        variant="ghost"
      />

      {/* Reminder time picker modal */}
      <Modal
        visible={showReminderPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReminderPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReminderPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{T.habit_detail_reminder_modal_title}</Text>
            <View style={styles.hourGrid}>
              {[6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22].map((h) => (
                <Pressable
                  key={h}
                  style={[styles.hourBtn, pickerHour === h && styles.hourBtnActive]}
                  onPress={() => setPickerHour(h)}
                >
                  <Text style={[styles.hourBtnText, pickerHour === h && styles.hourBtnTextActive]}>
                    {String(h).padStart(2,'0')}:00
                  </Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.modalActions}>
              <PixelButton
                title={T.habit_detail_reminder_set}
                onPress={async () => {
                  await scheduleHabitReminder(habit.id, habit.name, pickerHour, 0);
                  setReminder({ hour: pickerHour, minute: 0 });
                  setShowReminderPicker(false);
                }}
                style={{ flex: 1 }}
              />
              {reminder && (
                <PixelButton
                  title={T.habit_detail_reminder_remove}
                  onPress={async () => {
                    await cancelHabitReminder(habit.id);
                    setReminder(null);
                    setShowReminderPicker(false);
                  }}
                  variant="ghost"
                  style={{ flex: 1 }}
                />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <CompletionNoteModal
        visible={showNoteModal}
        habitName={habit.name}
        onSave={handleNoteSave}
        onSkip={handleNoteSkip}
      />
    </ScrollView>
  );
}



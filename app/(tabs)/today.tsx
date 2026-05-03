import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  FlatList,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../../src/lib/storage/mmkv';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { useT } from '../../src/lib/i18n';
import { HabitCard } from '../../src/features/habits/components/habit-card';
import { XpToast } from '../../src/ui/animations/xp-toast';
import { StreakMilestone } from '../../src/ui/animations/streak-milestone';
import { AllDoneCelebration } from '../../src/ui/animations/all-done-celebration';
import { DailyQuestsSection } from '../../src/features/daily-quests/components/daily-quests-section';
import { habitsStore$, fetchHabits, completeHabit, isHabitCompletedEnough } from '../../src/features/habits/stores/habits-store';
import { useStreakRiskNotification } from '../../src/features/notifications/hooks/use-streak-risk-notification';
import { useBurnoutSignal } from '../../src/features/habits/hooks/use-burnout-signal';
import { burnoutStore$, dismissBurnoutBanner, isDismissalActive } from '../../src/features/habits/stores/burnout-store';
import { brokenStreakStore$, dismissBrokenStreak, clearBrokenStreakForHabit } from '../../src/features/habits/stores/broken-streak-store';
import { pinnedHabitsStore$, togglePinHabit, isHabitPinned } from '../../src/features/habits/stores/pinned-habits-store';
import { TakeBreakModal } from '../../src/features/habits/components/take-break-modal';
import {
  getFreezesRemaining,
  isFreezeActiveToday,
  activateFreeze,
} from '../../src/features/habits/utils/streak-freeze';
import {
  getActiveMode,
  isHabitActiveInMode,
  getModeDefinition,
  getRemainingDays,
  deactivateMode,
} from '../../src/features/habits/utils/contextual-mode';
import { calculateXpEarned, calculateGoldEarned } from '../../src/lib/constants/game-config';
import { profileStore$, fetchProfile, refreshProfile } from '../../src/features/gamification/stores/profile-store';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { supabase } from '../../src/lib/supabase/client';
import {
  showRewardedInterstitial,
  preloadRewardedInterstitial,
  shouldShowAds,
} from '../../src/features/monetization/utils/ad-service';
import { getMaxFreezeTokens } from '../../src/features/monetization/utils/feature-gates';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

import { lang$ } from '../../src/lib/i18n';

function todayLabel(): string {
  const d = new Date();
  const lang = lang$.get();
  const dayNames = lang === 'fr' ? DAY_NAMES_FR : DAY_NAMES_EN;
  const monthNames = lang === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  return `${dayNames[d.getDay()].toUpperCase()} · ${d.getDate()} ${monthNames[d.getMonth()].toUpperCase()}`;
}

const ALL_KEY = 'all';
const MILESTONES = [7, 14, 30, 60, 100];

export default function TodayScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  dateLabel: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  headerStatXp: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.success,
  },
  headerStatGold: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.accent,
  },
  headerStatLevel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.xp,
  },
  freezeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4FC3F7',
  },
  freezeButtonActive: { backgroundColor: '#4FC3F7' },
  freezeText: {
    color: '#4FC3F7',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  freezeTextActive: { color: colors.background },
  watchAdButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.textMuted,
  },
  watchAdText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
  },
  addButtonText: {
    color: colors.text,
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    marginTop: -2,
  },

  // List
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  // Mode banner
  modeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 4,
    padding: spacing.sm,
    margin: spacing.md,
    marginBottom: 0,
  },
  modeBannerText: {
    color: colors.primary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
    flex: 1,
  },
  modeDeactivate: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    padding: spacing.xs,
  },

  // All done banner
  allDoneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.accent + '18',
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    borderBottomWidth: 4,
    padding: spacing.md,
  },
  allDoneEmoji: { fontSize: 36 },
  allDoneTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 2,
  },
  allDoneSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Habits section header
  habitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  habitsHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sortRow: { flexDirection: 'row', gap: spacing.xs },
  sortChip: {
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  sortChipText: { fontSize: 9, fontWeight: 'bold', color: colors.textMuted, letterSpacing: 0.5 },
  sortChipTextActive: { color: colors.primary },
  habitsTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  habitsCounter: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Progress bar
  progressBarWrap: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Category filter
  filterScroll: { flexGrow: 0, marginBottom: spacing.xs },
  filterRow: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  filterChipText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  filterChipTextActive: { color: colors.primary },

  // Streak recovery banner
  streakRecoveryBanner: {
    backgroundColor: colors.streak + '18',
    borderWidth: 2,
    borderColor: colors.streak,
    borderRadius: 4,
    padding: spacing.sm,
    margin: spacing.md,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakRecoveryText: { flex: 1, gap: 2 },
  streakRecoveryTitle: {
    color: colors.streak,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  streakRecoveryMsg: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  streakRecoveryBtn: {
    backgroundColor: colors.streak + '22',
    borderWidth: 1,
    borderColor: colors.streak,
    borderRadius: 3,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  streakRecoveryBtnText: {
    color: colors.streak,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  streakRecoveryClose: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    paddingHorizontal: spacing.xs,
  },

  // Burnout banner
  burnoutBanner: {
    backgroundColor: '#FF6B6B' + '18',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 4,
    padding: spacing.sm,
    margin: spacing.md,
    marginBottom: 0,
    gap: 2,
  },
  burnoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  burnoutText: { flex: 1, gap: 2 },
  burnoutMessage: {
    color: '#FF6B6B',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  burnoutSuggestion: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  burnoutClose: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    paddingHorizontal: spacing.xs,
  },
  burnoutAction: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 3,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  burnoutActionText: {
    color: '#FF6B6B',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Habits list padding
  listPad: { paddingHorizontal: spacing.md },

  // Empty state
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: {
    color: colors.textSecondary,
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyTips: {
    marginTop: spacing.md,
    gap: spacing.xs,
    alignSelf: 'stretch',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.md,
  },
  emptyTip: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    lineHeight: 18,
  },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const todayCompletions = use$(habitsStore$.todayCompletions);
  const weekCompletions = use$(habitsStore$.weekCompletions);

  const [activeMode, setActiveMode] = useState(() => getActiveMode());
  const [freezeActive, setFreezeActive] = useState(isFreezeActiveToday());
  const [freezesLeft, setFreezesLeft] = useState(getFreezesRemaining());
  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  const [sortMode, setSortMode] = useState<'smart' | 'streak' | 'az'>(
    () => (storage.getString('habit_sort_mode') as 'smart' | 'streak' | 'az') ?? 'smart',
  );
  const [xpToast, setXpToast] = useState<{ visible: boolean; xp: number; gold: number }>({
    visible: false, xp: 0, gold: 0,
  });
  const [todayXp, setTodayXp] = useState(0);
  const [milestoneSeen, setMilestoneSeen] = useState<number | null>(null);
  const [showAllDone, setShowAllDone] = useState(false);
  const allDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useStreakRiskNotification();
  const burnoutSignal = useBurnoutSignal();
  const burnoutLastDismissed = use$(burnoutStore$.lastDismissedAt);
  const burnoutDismissed = useMemo(() => isDismissalActive(), [burnoutLastDismissed]);
  const brokenStreaks = use$(brokenStreakStore$.items);
  const pinnedIds = use$(pinnedHabitsStore$.pinnedIds);
  const [takeBreakOpen, setTakeBreakOpen] = useState(false);
  const profile = use$(profileStore$.profile);
  const authUser = use$(authStore$.user);

  useEffect(() => { fetchHabits(); fetchProfile(); }, []);

  // Preload rewarded ad once on mount (only for free users)
  useEffect(() => {
    if (shouldShowAds()) {
      preloadRewardedInterstitial();
    }
  }, []);

  // Show "watch ad for freeze" button when:
  //   - ads are enabled (free tier, AdMob configured)
  //   - user has no freeze tokens left
  //   - freeze is not already active today
  //   - user has not yet hit the free-tier cap (1 token)
  const maxFreezeTokens = getMaxFreezeTokens();
  const showWatchAdButton =
    shouldShowAds() &&
    freezesLeft === 0 &&
    !freezeActive &&
    (profile?.freeze_tokens ?? 0) < maxFreezeTokens;

  const handleWatchAd = useCallback(() => {
    const userId = authUser?.id;
    if (!userId) return;

    showRewardedInterstitial(
      async () => {
        // onRewarded: increment on server then sync locally
        const { error } = await supabase
          .rpc('add_freeze_token' as never, { p_user_id: userId } as never);
        if (error) {
          Alert.alert('Error', 'Could not save your freeze token. Please try again.');
        } else {
          setFreezesLeft((prev) => prev + 1);
          refreshProfile();
        }
      },
      () => {
        // onComplete: ad closed — nothing extra needed
      },
    );
  }, [authUser?.id]);

  // Derive category list from habits
  const categories = useMemo(() => {
    const seen = new Set<string>();
    habits.forEach((h) => seen.add(h.category));
    return Array.from(seen);
  }, [habits]);

  // Filter + sort
  const displayedHabits = useMemo(() => {
    const filtered = (activeCategory === ALL_KEY
      ? habits
      : habits.filter((h) => h.category === activeCategory)
    ).filter((h) => isHabitActiveInMode(h.category, activeMode)).filter((h) => !(h as any).is_paused);
    return [...filtered].sort((a, b) => {
      // Pinned always first regardless of sort mode
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      if (sortMode === 'az') {
        return a.name.localeCompare(b.name);
      }
      if (sortMode === 'streak') {
        const aStreak = streaks[a.id]?.current_count ?? 0;
        const bStreak = streaks[b.id]?.current_count ?? 0;
        return bStreak - aStreak;
      }
      // smart: incomplete first
      const aDone = isHabitCompletedEnough(a.id);
      const bDone = isHabitCompletedEnough(b.id);
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [habits, activeCategory, todayCompletions, weekCompletions, pinnedIds, sortMode, streaks]);

  const activeHabits = habits.filter((h) => !(h as any).is_paused);
  const completedCount = activeHabits.filter((h) => isHabitCompletedEnough(h.id)).length;
  const totalCount = activeHabits.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleComplete = useCallback(async (habitId: string) => {
    const streak = streaks[habitId];
    const currentCount = streak?.current_count ?? 0;
    const xp = calculateXpEarned(currentCount + 1);
    const gold = calculateGoldEarned(xp);
    await completeHabit(habitId);
    clearBrokenStreakForHabit(habitId);
    setXpToast({ visible: true, xp, gold });
    setTodayXp((prev) => prev + xp);

    const newStreak = currentCount + 1;
    if (MILESTONES.includes(newStreak)) {
      setMilestoneSeen(newStreak);
    }

    const nowCompletedCount = activeHabits.filter((h) => isHabitCompletedEnough(h.id)).length;
    const afterCompletionCount = nowCompletedCount + 1;
    if (afterCompletionCount === totalCount && totalCount > 0) {
      if (allDoneTimerRef.current) clearTimeout(allDoneTimerRef.current);
      setShowAllDone(true);
      allDoneTimerRef.current = setTimeout(() => setShowAllDone(false), 3500);
    }
  }, [streaks, activeHabits, todayCompletions, totalCount]);

  const handleFreeze = () => {
    if (freezeActive) return;
    Alert.alert(
      T.today_freeze_alert_title,
      T.today_freeze_alert_msg,
      [
        { text: T.today_freeze_alert_cancel, style: 'cancel' },
        {
          text: T.today_freeze_alert_confirm,
          onPress: () => {
            const ok = activateFreeze();
            if (ok) {
              setFreezeActive(true);
              setFreezesLeft(getFreezesRemaining());
            }
          },
        },
      ],
    );
  };

  const ListHeader = (
    <View>
      {/* Active mode banner */}
      {activeMode && (() => {
        const def = getModeDefinition(activeMode.key);
        const days = getRemainingDays(activeMode);
        return def ? (
          <View style={styles.modeBanner}>
            <Text style={styles.modeBannerText}>{def.emoji} {def.name.toUpperCase()} — {T.today_mode_days.replace('{n}', String(days))}</Text>
            <Pressable onPress={() => { deactivateMode(); setActiveMode(null); }}>
              <Text style={styles.modeDeactivate}>✕</Text>
            </Pressable>
          </View>
        ) : null;
      })()}

      {/* Streak recovery banners */}
      {brokenStreaks.map((b) => (
        <View key={b.habitId} style={styles.streakRecoveryBanner}>
          <View style={styles.streakRecoveryText}>
            <Text style={styles.streakRecoveryTitle}>{T.streak_broken_title}</Text>
            <Text style={styles.streakRecoveryMsg}>
              {T.streak_broken_msg.replace('{n}', String(b.wasCount)).replace('{name}', b.habitName)}
            </Text>
          </View>
          <Pressable style={styles.streakRecoveryBtn} onPress={() => handleComplete(b.habitId)} hitSlop={4}>
            <Text style={styles.streakRecoveryBtnText}>{T.streak_broken_restart}</Text>
          </Pressable>
          <Pressable onPress={() => dismissBrokenStreak(b.habitId)} hitSlop={8}>
            <Text style={styles.streakRecoveryClose}>✕</Text>
          </Pressable>
        </View>
      ))}

      {/* Burnout banner */}
      {burnoutSignal.risk !== 'none' && !burnoutDismissed && (
        <View style={styles.burnoutBanner}>
          <View style={styles.burnoutRow}>
            <View style={styles.burnoutText}>
              <Text style={styles.burnoutMessage}>
                {burnoutSignal.risk === 'high' ? T.burnout_high_message
                  : burnoutSignal.risk === 'moderate' ? T.burnout_moderate_message
                  : T.burnout_mild_message}
              </Text>
              <Text style={styles.burnoutSuggestion}>
                {burnoutSignal.risk === 'high' ? T.burnout_high_suggestion
                  : burnoutSignal.risk === 'moderate' ? T.burnout_moderate_suggestion
                  : T.burnout_mild_suggestion}
              </Text>
            </View>
            <Pressable onPress={dismissBurnoutBanner} hitSlop={8}>
              <Text style={styles.burnoutClose}>✕</Text>
            </Pressable>
          </View>
          {(burnoutSignal.risk === 'high' || burnoutSignal.risk === 'moderate') && (
            <Pressable style={styles.burnoutAction} onPress={() => setTakeBreakOpen(true)}>
              <Text style={styles.burnoutActionText}>{T.today_burnout_action}</Text>
            </Pressable>
          )}
        </View>
      )}

      <TakeBreakModal
        visible={takeBreakOpen}
        onClose={() => setTakeBreakOpen(false)}
        onBreakTaken={(count) =>
          Alert.alert(
            T.today_break_taken_title,
            T.today_break_taken_msg
              .replace('{n}', String(count))
              .replace('{s}', count > 1 ? 's' : '')
              .replace('{ss}', count > 1 ? 's' : ''),
          )
        }
      />

      {/* All done banner */}
      {allDone && (
        <View style={styles.allDoneBanner}>
          <Text style={styles.allDoneEmoji}>🏆</Text>
          <View>
            <Text style={styles.allDoneTitle}>{T.today_all_done_title}</Text>
            <Text style={styles.allDoneSub}>{T.today_all_done_sub}</Text>
          </View>
        </View>
      )}

      {/* Habits header */}
      <View style={styles.habitsHeader}>
        <View style={styles.habitsHeaderLeft}>
          <Text style={styles.habitsTitle}>{T.today_habits_label}</Text>
          <Text style={styles.habitsCounter}>
            {completedCount}/{totalCount}
          </Text>
        </View>
        <View style={styles.sortRow}>
          {(['smart', 'streak', 'az'] as const).map((mode) => {
            const label = mode === 'smart' ? T.habit_sort_smart : mode === 'streak' ? T.habit_sort_streak : T.habit_sort_az;
            const active = sortMode === mode;
            return (
              <Pressable key={mode} style={[styles.sortChip, active && styles.sortChipActive]} onPress={() => { setSortMode(mode); storage.set('habit_sort_mode', mode); }}>
                <Text style={[styles.sortChipText, active && styles.sortChipTextActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarWrap}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              backgroundColor: allDone ? colors.accent : colors.success,
            },
          ]}
        />
      </View>

      {/* Category filter */}
      {categories.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
        >
          {[ALL_KEY, ...categories].map((cat) => (
            <Pressable
              key={cat}
              style={[styles.filterChip, activeCategory === cat && styles.filterChipActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text
                style={[styles.filterChipText, activeCategory === cat && styles.filterChipTextActive]}
              >
                {cat === ALL_KEY ? T.today_filter_all : cat.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* XP Toast */}
      <XpToast
        visible={xpToast.visible}
        xpAmount={xpToast.xp}
        goldAmount={xpToast.gold}
        onComplete={() => setXpToast((p) => ({ ...p, visible: false }))}
      />
      <StreakMilestone
        streak={milestoneSeen ?? 0}
        visible={milestoneSeen !== null}
        onDismiss={() => setMilestoneSeen(null)}
      />
      <AllDoneCelebration visible={showAllDone} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{T.today_title}</Text>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
        </View>
        <View style={styles.headerRight}>
          {profile && (
            <View style={styles.headerStats}>
              {todayXp > 0 && (
                <Text style={styles.headerStatXp}>+{todayXp} XP</Text>
              )}
              <Text style={styles.headerStatGold}>💰{profile.gold}</Text>
              <Text style={styles.headerStatLevel}>Lv.{profile.level}</Text>
            </View>
          )}
          {(freezesLeft > 0 || freezeActive) && (
            <Pressable
              style={[styles.freezeButton, freezeActive && styles.freezeButtonActive]}
              onPress={handleFreeze}
              disabled={freezeActive}
            >
              <Text style={[styles.freezeText, freezeActive && styles.freezeTextActive]}>
                {freezeActive ? T.today_freeze_active : T.today_freeze_available.replace('{n}', String(freezesLeft))}
              </Text>
            </Pressable>
          )}
          {showWatchAdButton && (
            <Pressable style={styles.watchAdButton} onPress={handleWatchAd}>
              <Text style={styles.watchAdText}>{T.today_watch_ad}</Text>
            </Pressable>
          )}
          <Pressable style={styles.addButton} onPress={() => router.push('/habit/create')}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      </View>

      {/* Unified list */}
      {habits.length === 0 ? (
        <View>
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⚔️</Text>
            <Text style={styles.emptyTitle}>{T.today_empty_title}</Text>
            <Text style={styles.emptySubtitle}>{T.today_empty_subtitle}</Text>
            <View style={styles.emptyTips}>
              <Text style={styles.emptyTip}>{T.today_empty_tip1}</Text>
              <Text style={styles.emptyTip}>{T.today_empty_tip2}</Text>
              <Text style={styles.emptyTip}>{T.today_empty_tip3}</Text>
            </View>
          </View>
          <DailyQuestsSection
            pausedCategories={activeMode ? (getModeDefinition(activeMode.key)?.pauseCategories ?? []) : []}
          />
        </View>
      ) : (
        <FlatList
          data={displayedHabits}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={
            <DailyQuestsSection
              pausedCategories={activeMode ? (getModeDefinition(activeMode.key)?.pauseCategories ?? []) : []}
            />
          }
          contentContainerStyle={styles.listContent}
          style={styles.list}
          renderItem={({ item, index }) => {
            const pinned = pinnedIds.includes(item.id);
            return (
              <HabitCard
                name={item.name}
                category={item.category}
                streakCount={streaks[item.id]?.current_count ?? 0}
                isCompletedToday={!!todayCompletions[item.id]}
                onComplete={() => handleComplete(item.id)}
                onPress={() => router.push(`/habit/${item.id}`)}
                onLongPress={() =>
                  Alert.alert(
                    T.habit_pin_title,
                    pinned
                      ? T.habit_unpin_msg.replace('{name}', item.name)
                      : T.habit_pin_msg.replace('{name}', item.name),
                    [
                      { text: T.common_cancel, style: 'cancel' },
                      {
                        text: pinned ? T.habit_unpin_confirm : T.habit_pin_confirm,
                        onPress: () => togglePinHabit(item.id),
                      },
                    ],
                  )
                }
                index={index}
                frequency={item.frequency ?? 'daily'}
                weekCompletionCount={weekCompletions[item.id] ?? 0}
                contentType={(item.content as { type?: string } | null)?.type as 'timer' | 'checklist' | 'link' | null ?? null}
                isPinned={pinned}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  );
}



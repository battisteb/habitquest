import { listTools } from '../../src/features/habits/utils/list-tools';
import { adventureDay, isRevealed } from '../../src/features/habits/utils/today-reveal';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  FlatList,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../../src/lib/storage/mmkv';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { useT, lang$ } from '../../src/lib/i18n';
import { HabitCard } from '../../src/features/habits/components/habit-card';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { XpToast } from '../../src/ui/animations/xp-toast';
import { AllDoneCelebration } from '../../src/ui/animations/all-done-celebration';
import { DailyQuestsSection, MissionsTile } from '../../src/features/daily-quests/components/daily-quests-section';
import { habitsStore$, fetchHabits, completeHabit, uncompleteHabit, repairStreak, isHabitCompletedEnough, isActiveToday } from '../../src/features/habits/stores/habits-store';
import { useStreakRiskNotification } from '../../src/features/notifications/hooks/use-streak-risk-notification';
import { useBurnoutSignal } from '../../src/features/habits/hooks/use-burnout-signal';
import { burnoutStore$, dismissBurnoutBanner, isDismissalActive } from '../../src/features/habits/stores/burnout-store';
import { brokenStreakStore$, dismissBrokenStreak, clearBrokenStreakForHabit } from '../../src/features/habits/stores/broken-streak-store';
import { pinnedHabitsStore$, togglePinHabit } from '../../src/features/habits/stores/pinned-habits-store';
import { TodayTutorial } from '../../src/features/onboarding/components/today-tutorial';
import { TrialBanner } from '../../src/features/monetization/components/trial-banner';
import { ComebackBanner, comebackHoursLeft } from '../../src/features/habits/components/comeback-banner';
import { pickTodayBanner } from '../../src/features/habits/utils/today-banner';
import { subscriptionStore$ } from '../../src/features/monetization/stores/subscription-store';
import { trialDaysLeft } from '../../src/features/monetization/utils/trial-offer';
import { MoodCheckIn } from '../../src/features/mood/components/mood-check-in';
import { streakRepairCost } from '../../src/lib/constants/game-config';
import { HeroGreeting } from '../../src/features/avatar/components/hero-greeting';
import { useTourTarget } from '../../src/features/onboarding/tour/tour-targets';
import { fullyPausedCategories } from '../../src/features/habits/utils/pause';
import { profileStore$, fetchProfile, refreshProfile } from '../../src/features/gamification/stores/profile-store';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { supabase } from '../../src/lib/supabase/client';
import {
  showRewardedInterstitial,
  preloadRewardedInterstitial,
  shouldShowAds,
} from '../../src/features/monetization/utils/ad-service';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

const DAY_NAMES_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const DAY_NAMES_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
const MONTH_NAMES_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

import { categoryLabel } from '../../src/lib/i18n/labels';
import { Pip } from '../../src/features/mascot/components/pip';
import { BossCard } from '../../src/features/boss/components/boss-card';
import { ArcBanner } from '../../src/features/arc/components/arc-banner';

function todayLabel(): string {
  const d = new Date();
  const lang = lang$.get();
  // Japanese: 10月3日（土）
  if (lang === 'ja') return `${d.getMonth() + 1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;
  const dayNames = lang === 'fr' ? DAY_NAMES_FR : DAY_NAMES_EN;
  const monthNames = lang === 'fr' ? MONTH_NAMES_FR : MONTH_NAMES_EN;
  return `${dayNames[d.getDay()].toUpperCase()} · ${d.getDate()} ${monthNames[d.getMonth()].toUpperCase()}`;
}

const ALL_KEY = 'all';

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
  // The left block shrinks so "AUJOURD'HUI" never pushes the buttons off screen.
  headerLeft: { flexShrink: 1, marginRight: spacing.sm },
  title: {
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 0.5,
  },
  dateLabel: {
    fontSize: pixelSize(fontSizes.xs),
    color: colors.textMuted,
    fontFamily: fonts.bold,
    letterSpacing: 1,
    marginTop: 1,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 0 },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  headerStatXp: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.success,
  },
  headerStatGold: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.accent,
  },
  headerStatLevel: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.xp,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 0,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
  },
  addButtonText: {
    color: colors.text,
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    marginTop: -2,
  },

  // List
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  // Paused quests banner (D3)
  modeBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.primary + '18',
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 0,
    padding: spacing.sm,
    margin: spacing.md,
    marginBottom: 0,
  },
  modeBannerText: {
    color: colors.primary,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
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
    borderRadius: 0,
    borderBottomWidth: 4,
    padding: spacing.md,
  },
  allDoneEmoji: { fontSize: 36 },
  allDoneTitle: {
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  sortChipText: { fontSize: pixelSize(9), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 0.5 },
  sortChipTextActive: { color: colors.primary },
  habitsTitle: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 2,
  },
  habitsCounter: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Progress bar
  progressBarWrap: {
    height: 4,
    backgroundColor: colors.border,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: 0,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 0,
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
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  filterChipText: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  filterChipTextActive: { color: colors.primary },

  // Streak recovery banner
  streakRecoveryBanner: {
    backgroundColor: colors.streak + '18',
    borderWidth: 2,
    borderColor: colors.streak,
    borderRadius: 0,
    padding: spacing.sm,
    margin: spacing.md,
    marginBottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakRecoveryText: { flex: 1, gap: 2 },
  streakRecoveryActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
  streakRecoveryTitle: {
    color: colors.streak,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
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
    borderRadius: 0,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  streakRecoveryBtnText: {
    color: colors.streak,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  streakRecoveryClose: {
    color: colors.textMuted,
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    paddingHorizontal: spacing.xs,
  },

  // Burnout banner
  burnoutBanner: {
    backgroundColor: '#FF6B6B' + '18',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    borderRadius: 0,
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
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  burnoutSuggestion: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    lineHeight: 16,
  },
  burnoutClose: {
    color: colors.textMuted,
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    paddingHorizontal: spacing.xs,
  },
  burnoutAction: {
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 0,
    paddingVertical: spacing.xs,
    alignItems: 'center',
  },
  burnoutActionText: {
    color: '#FF6B6B',
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },

  // Habits list padding
  listPad: { paddingHorizontal: spacing.md },
  // The list already has a horizontal padding: cancel the section's own.
  missionsSlot: { marginHorizontal: -spacing.md, marginTop: spacing.sm },
  goalsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, marginBottom: spacing.sm },
  toolsRow: { paddingHorizontal: spacing.md, paddingBottom: spacing.xs },

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
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
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
    borderRadius: 0,
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

  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  // Folded by default: the missions list and the sort/filter chips (lighter Today).
  const [missionsOpen, setMissionsOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [sortMode, setSortMode] = useState<'smart' | 'streak' | 'az'>(
    () => (storage.getString('habit_sort_mode') as 'smart' | 'streak' | 'az') ?? 'smart',
  );
  const [xpToast, setXpToast] = useState<{ visible: boolean; xp: number; gold: number }>({
    visible: false, xp: 0, gold: 0,
  });
  const [todayXp, setTodayXp] = useState(0);
  const [showAllDone, setShowAllDone] = useState(false);
  const allDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useStreakRiskNotification();
  const burnoutSignal = useBurnoutSignal();
  const burnoutLastDismissed = use$(burnoutStore$.lastDismissedAt);
  const burnoutDismissed = useMemo(() => isDismissalActive(), [burnoutLastDismissed]);
  const trialEndsAt = use$(subscriptionStore$.trialEndsAt);
  const brokenStreaks = use$(brokenStreakStore$.items);
  const pinnedIds = use$(pinnedHabitsStore$.pinnedIds);
  const profile = use$(profileStore$.profile);
  const authUser = use$(authStore$.user);

  useEffect(() => { fetchHabits(); fetchProfile(); }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([fetchHabits(), fetchProfile()]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Preload rewarded ad once on mount (only for free users)
  useEffect(() => {
    if (shouldShowAds()) {
      preloadRewardedInterstitial();
    }
  }, []);


  // Derive category list from habits
  const categories = useMemo(() => {
    const seen = new Set<string>();
    habits.forEach((h) => seen.add(h.category));
    return Array.from(seen);
  }, [habits]);

  // D6: sorting and filters only help with many quests; below that they are
  // noise, and a filter left on must not hide quests with no way to clear it.
  const { show: showListTools, category, sort } = listTools(habits.length, activeCategory, sortMode, ALL_KEY);

  // Filter + sort
  const displayedHabits = useMemo(() => {
    const filtered = (category === ALL_KEY
      ? habits
      : habits.filter((h) => h.category === category)
    ).filter((h) => isActiveToday(h));
    return [...filtered].sort((a, b) => {
      // Pinned always first regardless of sort mode
      const aPinned = pinnedIds.includes(a.id);
      const bPinned = pinnedIds.includes(b.id);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;

      if (sort === 'az') {
        return a.name.localeCompare(b.name);
      }
      if (sort === 'streak') {
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
  }, [habits, category, todayCompletions, weekCompletions, pinnedIds, sort, streaks]);

  const activeHabits = habits.filter((h) => isActiveToday(h));
  const pausedCount = habits.filter((h) => h.is_paused && !h.is_archived).length;
  const pausedCategories = useMemo(() => fullyPausedCategories(habits), [habits]);
  const completedCount = activeHabits.filter((h) => isHabitCompletedEnough(h.id)).length;
  const totalCount = activeHabits.length;
  const allDone = totalCount > 0 && completedCount === totalCount;
  const addTarget = useTourTarget('add');
  const firstPendingId = displayedHabits.find((h) => !isHabitCompletedEnough(h.id))?.id;
  const pendingStreaks = activeHabits
    .filter((h) => !isHabitCompletedEnough(h.id))
    .map((h) => streaks[h.id]?.current_count ?? 0);
  const hero = (
    <HeroGreeting
      totalHabits={totalCount}
      restDay={habits.length > 0 && totalCount === 0}
      pendingStreaks={pendingStreaks}
      xp={profile?.xp ?? 0}
      level={profile?.level ?? 1}
    />
  );

  const handleComplete = useCallback(async (habitId: string, mini = false) => {
    // Count before completing: completeHabit already marks the habit done in the store.
    const completedBefore = activeHabits.filter((h) => isHabitCompletedEnough(h.id)).length;
    const result = await completeHabit(habitId, undefined, mini);
    if (!result) return;
    clearBrokenStreakForHabit(habitId);
    // Show what the server actually granted (freezes, bonuses…).
    setXpToast({ visible: true, xp: result.xp_earned, gold: result.gold_earned });
    setTodayXp((prev) => prev + result.xp_earned);

    // Streak milestones are celebrated by the global StreakMilestoneOverlay
    // (triggered in completeHabit from the server-computed streak).

    if (completedBefore + 1 === totalCount && totalCount > 0) {
      if (allDoneTimerRef.current) clearTimeout(allDoneTimerRef.current);
      setShowAllDone(true);
      allDoneTimerRef.current = setTimeout(() => setShowAllDone(false), 3500);
    }
  }, [streaks, activeHabits, todayCompletions, totalCount]);

  // Repair a broken streak (ADR 021): confirm the gold price, or watch an ad.
  const handleRepair = useCallback((habitId: string, wasCount: number, withAd: boolean) => {
    const run = async () => {
      const result = await repairStreak(habitId, withAd).catch(() => null);
      if (!result) {
        Alert.alert(T.today_freeze_error_title, T.today_freeze_error_msg);
      } else if (result.success) {
        Alert.alert(T.streak_repair_done_title, T.streak_repair_done_msg.replace('{n}', String(result.current_streak ?? wasCount)));
      } else if (result.reason === 'not_enough_gold') {
        Alert.alert(T.streak_repair_no_gold_title, T.streak_repair_no_gold_msg.replace('{cost}', String(result.cost ?? streakRepairCost(wasCount))));
      } else {
        Alert.alert(T.streak_repair_unavailable_title, result.reason === 'ad_used_today' ? T.streak_repair_ad_used : T.streak_repair_expired);
      }
    };
    if (withAd) {
      showRewardedInterstitial(() => void run());
      return;
    }
    Alert.alert(
      T.streak_repair_confirm_title,
      T.streak_repair_confirm_msg.replace('{n}', String(wasCount)).replace('{cost}', String(streakRepairCost(wasCount))),
      [
        { text: T.common_cancel, style: 'cancel' },
        { text: T.streak_repair_confirm, onPress: () => void run() },
      ],
    );
  }, [T]);

  // Undo a validation tapped by mistake: confirm first, it takes the rewards back.
  const handleUncomplete = useCallback((habitId: string, name: string) => {
    Alert.alert(T.habit_undo_title, T.habit_undo_msg.replace('{name}', name), [
      { text: T.common_cancel, style: 'cancel' },
      {
        text: T.habit_undo_confirm,
        style: 'destructive',
        onPress: async () => {
          const result = await uncompleteHabit(habitId).catch(() => undefined);
          if (result) setTodayXp((prev) => Math.max(0, prev - result.xp_lost));
        },
      },
    ]);
  }, [T]);


  // One banner at a time (D4): broken streak > comeback > trial > burnout.
  const banner = pickTodayBanner({
    broken: brokenStreaks.length > 0,
    comeback: comebackHoursLeft(profile?.comeback_until) !== null,
    trial: trialDaysLeft(trialEndsAt) !== null,
    burnout: burnoutSignal.risk !== 'none' && !burnoutDismissed,
  });

  // Progressive Today (D5): the rest arrives over the first week.
  const day = adventureDay(profile?.created_at);

  const ListHeader = (
    <View>
      {hero}
      {/* The day's goals in one row of tiles: missions (from day 2), the
          seasonal arc and the weekly boss (from day 3, D5). */}
      {(isRevealed('missions', day) || isRevealed('boss', day)) && (
        <View style={styles.goalsRow}>
          {isRevealed('missions', day) && (
            <MissionsTile open={missionsOpen} onPress={() => setMissionsOpen((o) => !o)} />
          )}
          {isRevealed('boss', day) && <ArcBanner variant="tile" />}
          {isRevealed('boss', day) && <BossCard variant="tile" />}
        </View>
      )}
      {isRevealed('missions', day) && missionsOpen && (
        <View style={styles.missionsSlot}>
          <DailyQuestsSection listOnly pausedCategories={pausedCategories} />
        </View>
      )}
      {/* Paused quests (D3): their streaks are protected; manage them in Pause. */}
      {pausedCount > 0 && (
        <Pressable style={styles.modeBanner} onPress={() => router.push('/pause')} accessibilityRole="button" testID="paused-banner">
          <Text style={styles.modeBannerText}>{T.today_paused_banner.replace('{n}', String(pausedCount))}</Text>
          <Text style={styles.modeDeactivate}>{T.today_paused_manage}</Text>
        </Pressable>
      )}

      {banner === 'trial' && <TrialBanner />}
      {banner === 'comeback' && <ComebackBanner />}
      {isRevealed('mood', day) && <MoodCheckIn />}

      {/* Streak recovery: one at a time (D4), the others come after it is closed */}
      {banner === 'broken' && brokenStreaks.slice(0, 1).map((b) => (
        <View key={b.habitId} style={styles.streakRecoveryBanner}>
          <Pip expression="sad" size={40} accessibilityLabel="Pip" />
          <View style={styles.streakRecoveryText}>
            <Text style={styles.streakRecoveryTitle}>{T.streak_broken_title}</Text>
            <Text style={styles.streakRecoveryMsg}>
              {T.streak_broken_msg.replace('{n}', String(b.wasCount)).replace('{name}', b.habitName)}
            </Text>
            <View style={styles.streakRecoveryActions}>
              {/* Repair within 48 h (ADR 021): gold, or a rewarded ad for free players. */}
              <Pressable style={styles.streakRecoveryBtn} onPress={() => handleRepair(b.habitId, b.wasCount, false)} hitSlop={4} testID="streak-repair">
                <Text style={styles.streakRecoveryBtnText}>
                  {T.streak_repair_btn.replace('{cost}', String(streakRepairCost(b.wasCount)))}
                </Text>
              </Pressable>
              {shouldShowAds() && (
                <Pressable style={styles.streakRecoveryBtn} onPress={() => handleRepair(b.habitId, b.wasCount, true)} hitSlop={4}>
                  <Text style={styles.streakRecoveryBtnText}>{T.streak_repair_ad_btn}</Text>
                </Pressable>
              )}
              <Pressable style={styles.streakRecoveryBtn} onPress={() => handleComplete(b.habitId)} hitSlop={4}>
                <Text style={styles.streakRecoveryBtnText}>{T.streak_broken_restart}</Text>
              </Pressable>
            </View>
          </View>
          <Pressable onPress={() => dismissBrokenStreak(b.habitId)} hitSlop={8}>
            <Text style={styles.streakRecoveryClose}>✕</Text>
          </Pressable>
        </View>
      ))}

      {/* Burnout banner */}
      {banner === 'burnout' && (
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
            <Pressable style={styles.burnoutAction} onPress={() => router.push('/pause?suggest=1')}>
              <Text style={styles.burnoutActionText}>{T.today_burnout_action}</Text>
            </Pressable>
          )}
        </View>
      )}


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
        {showListTools && (
          <Pressable
            style={[styles.sortChip, (toolsOpen || sort !== 'smart' || category !== ALL_KEY) && styles.sortChipActive]}
            onPress={() => setToolsOpen((o) => !o)}
            accessibilityRole="button"
            accessibilityState={{ expanded: toolsOpen }}
            testID="habit-tools"
          >
            <Text style={[styles.sortChipText, (toolsOpen || sort !== 'smart' || category !== ALL_KEY) && styles.sortChipTextActive]}>
              {T.today_sort_filter}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Sorting, folded behind one button until asked for. */}
      {showListTools && toolsOpen && (
        <View style={[styles.sortRow, styles.toolsRow]} testID="habit-sort">
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
      )}

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
      {showListTools && toolsOpen && categories.length > 1 && (
        <ScrollView
          testID="habit-filters"
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
                {cat === ALL_KEY ? T.today_filter_all : categoryLabel(T, cat).toUpperCase()}
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
      <AllDoneCelebration visible={showAllDone} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
            {T.today_title}
          </Text>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
        </View>
        <View style={styles.headerRight}>
          {profile && (
            <View style={styles.headerStats}>
              {todayXp > 0 && (
                <Text style={styles.headerStatXp}>+{todayXp} XP</Text>
              )}
              <Pressable onPress={() => router.push('/shop')} hitSlop={8} accessibilityRole="button" testID="header-gold">
                <Text style={styles.headerStatGold}>💰{profile.gold}</Text>
              </Pressable>
              <Text style={styles.headerStatLevel}>Lv.{profile.level}</Text>
            </View>
          )}
          <View {...addTarget}>
            <Pressable style={styles.addButton} onPress={() => router.push('/habit/create')}>
              <Text style={styles.addButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Unified list */}
      {habits.length === 0 ? (
        <View>
          {hero}
          <View style={styles.empty}>
            <Pip expression="happy" size={72} accessibilityLabel="Pip" />
            <Text style={styles.emptyTitle}>{T.today_empty_title}</Text>
            <Text style={styles.emptySubtitle}>{T.today_empty_subtitle}</Text>
            <View style={styles.emptyTips}>
              <Text style={styles.emptyTip}>{T.today_empty_tip1}</Text>
              <Text style={styles.emptyTip}>{T.today_empty_tip2}</Text>
              <Text style={styles.emptyTip}>{T.today_empty_tip3}</Text>
            </View>
            <PixelButton
              title={T.today_empty_cta}
              onPress={() => router.push('/habit/create')}
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            />
          </View>
          {isRevealed('missions', day) && (
            <DailyQuestsSection
              pausedCategories={pausedCategories}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={displayedHabits}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          style={styles.list}
          ListEmptyComponent={
            activeHabits.length === 0 ? (
              // Rest day: none of the quests is planned today (chosen days).
              <View style={styles.empty} testID="rest-day">
                <Pip expression="sleepy" size={72} accessibilityLabel="Pip" />
                <Text style={styles.emptyTitle}>{T.today_rest_title}</Text>
                <Text style={styles.emptySubtitle}>{T.today_rest_body}</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const pinned = pinnedIds.includes(item.id);
            return (
              <HabitCard
                name={item.name}
                category={item.category}
                streakCount={streaks[item.id]?.current_count ?? 0}
                isCompletedToday={!!todayCompletions[item.id]}
                onComplete={() => handleComplete(item.id)}
                onCompleteMini={
                  item.mini
                    ? () =>
                        Alert.alert(T.habit_mini_title, T.habit_mini_msg.replace('{mini}', item.mini ?? ''), [
                          { text: T.common_cancel, style: 'cancel' },
                          { text: T.habit_mini_confirm, onPress: () => handleComplete(item.id, true) },
                        ])
                    : undefined
                }
                onUncomplete={() => handleUncomplete(item.id, item.name)}
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
                days={item.days}
                weekCompletionCount={weekCompletions[item.id] ?? 0}
                contentType={(item.content as { type?: string } | null)?.type as 'timer' | 'checklist' | 'link' | null ?? null}
                isPinned={pinned}
                emoji={(item as any).emoji ?? null}
                tourTarget={item.id === firstPendingId}
              />
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}

      {/* Last child: the guided tour draws over the whole screen. */}
      <TodayTutorial />
    </View>
  );
}



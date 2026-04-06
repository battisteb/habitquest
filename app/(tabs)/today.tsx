import { useEffect, useState, useCallback, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { HabitCard } from '../../src/features/habits/components/habit-card';
import { XpToast } from '../../src/ui/animations/xp-toast';
import { DailyQuestsSection } from '../../src/features/daily-quests/components/daily-quests-section';
import { habitsStore$, fetchHabits, completeHabit } from '../../src/features/habits/stores/habits-store';
import { useStreakRiskNotification } from '../../src/features/notifications/hooks/use-streak-risk-notification';
import {
  getFreezesRemaining,
  isFreezeActiveToday,
  activateFreeze,
} from '../../src/features/habits/utils/streak-freeze';
import { calculateXpEarned, calculateGoldEarned } from '../../src/lib/constants/game-config';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function todayLabel(): string {
  const d = new Date();
  return `${DAY_NAMES[d.getDay()].toUpperCase()} · ${d.getDate()} ${MONTH_NAMES[d.getMonth()].toUpperCase()}`;
}

const ALL_KEY = 'all';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const todayCompletions = use$(habitsStore$.todayCompletions);

  const [freezeActive, setFreezeActive] = useState(isFreezeActiveToday());
  const [freezesLeft, setFreezesLeft] = useState(getFreezesRemaining());
  const [activeCategory, setActiveCategory] = useState(ALL_KEY);
  const [xpToast, setXpToast] = useState<{ visible: boolean; xp: number; gold: number }>({
    visible: false, xp: 0, gold: 0,
  });

  useStreakRiskNotification();

  useEffect(() => { fetchHabits(); }, []);

  // Derive category list from habits
  const categories = useMemo(() => {
    const seen = new Set<string>();
    habits.forEach((h) => seen.add(h.category));
    return Array.from(seen);
  }, [habits]);

  // Filter + sort: exclude paused, incomplete first, then completed
  const displayedHabits = useMemo(() => {
    const filtered = (activeCategory === ALL_KEY
      ? habits
      : habits.filter((h) => h.category === activeCategory)
    ).filter((h) => !(h as any).is_paused);
    return [...filtered].sort((a, b) => {
      const aDone = !!todayCompletions[a.id];
      const bDone = !!todayCompletions[b.id];
      if (aDone === bDone) return 0;
      return aDone ? 1 : -1;
    });
  }, [habits, activeCategory, todayCompletions]);

  const activeHabits = habits.filter((h) => !(h as any).is_paused);
  const completedCount = activeHabits.filter((h) => !!todayCompletions[h.id]).length;
  const totalCount = activeHabits.length;
  const allDone = totalCount > 0 && completedCount === totalCount;

  const handleComplete = useCallback(async (habitId: string) => {
    const streak = streaks[habitId];
    const currentCount = streak?.current_count ?? 0;
    const xp = calculateXpEarned(currentCount + 1);
    const gold = calculateGoldEarned(xp);
    await completeHabit(habitId);
    setXpToast({ visible: true, xp, gold });
  }, [streaks]);

  const handleFreeze = () => {
    if (freezeActive) return;
    Alert.alert(
      'Streak Freeze',
      'Use your rest day? All streaks will be protected today. You have 1 per week.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Activate',
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
      {/* Daily quests */}
      <DailyQuestsSection />

      {/* All done banner */}
      {allDone && (
        <View style={styles.allDoneBanner}>
          <Text style={styles.allDoneEmoji}>🏆</Text>
          <View>
            <Text style={styles.allDoneTitle}>ALL DONE!</Text>
            <Text style={styles.allDoneSub}>Perfect day. Come back tomorrow.</Text>
          </View>
        </View>
      )}

      {/* Habits header */}
      <View style={styles.habitsHeader}>
        <View style={styles.habitsHeaderLeft}>
          <Text style={styles.habitsTitle}>HABITS</Text>
          <Text style={styles.habitsCounter}>
            {completedCount}/{totalCount}
          </Text>
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
                {cat === ALL_KEY ? 'ALL' : cat.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* XP Toast */}
      <XpToast
        visible={xpToast.visible}
        xpAmount={xpToast.xp}
        goldAmount={xpToast.gold}
        onComplete={() => setXpToast((p) => ({ ...p, visible: false }))}
      />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>TODAY</Text>
          <Text style={styles.dateLabel}>{todayLabel()}</Text>
        </View>
        <View style={styles.headerRight}>
          {(freezesLeft > 0 || freezeActive) && (
            <Pressable
              style={[styles.freezeButton, freezeActive && styles.freezeButtonActive]}
              onPress={handleFreeze}
              disabled={freezeActive}
            >
              <Text style={[styles.freezeText, freezeActive && styles.freezeTextActive]}>
                {freezeActive ? '❄️ REST DAY' : `❄️ REST (${freezesLeft})`}
              </Text>
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
          <DailyQuestsSection />
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⚔️</Text>
            <Text style={styles.emptyTitle}>No quests yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to create your first habit</Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={displayedHabits}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={ListHeader}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          renderItem={({ item }) => (
            <HabitCard
              name={item.name}
              category={item.category}
              streakCount={streaks[item.id]?.current_count ?? 0}
              isCompletedToday={!!todayCompletions[item.id]}
              onComplete={() => handleComplete(item.id)}
              onPress={() => router.push(`/habit/${item.id}`)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  },
});

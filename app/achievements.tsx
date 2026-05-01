import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../src/ui/components/pixel-button';
import { AchievementCard } from '../src/features/gamification/components/achievement-card';
import {
  achievementsStore$,
  fetchAchievements,
} from '../src/features/gamification/stores/achievements-store';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';
import { useT } from '../src/lib/i18n';

const CATEGORY_KEYS = ['all', 'streak', 'completion', 'xp', 'social', 'shop', 'special'] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];
const CATEGORY_ICONS: Record<CategoryKey, string> = {
  all: '🏅',
  streak: '🔥',
  completion: '✅',
  xp: '⭐',
  social: '👥',
  shop: '🛒',
  special: '🏆',
};

export default function AchievementsScreen() {
  const T = useT();
  const CATEGORY_LABELS: Record<CategoryKey, string> = {
    all: T.ach_cat_all,
    streak: T.ach_cat_streak,
    completion: T.ach_cat_completion,
    xp: T.ach_cat_xp,
    social: T.ach_cat_social,
    shop: T.ach_cat_shop,
    special: T.ach_cat_special,
  };
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  counter: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.accent,
    width: 60,
    textAlign: 'right',
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  summaryTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  summaryFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 3,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    minWidth: 70,
    textAlign: 'right',
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterRow: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accent + '22',
  },
  filterIcon: { fontSize: 12 },
  filterLabel: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  filterLabelActive: { color: colors.accent },
  filterCount: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: colors.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
  filterCountActive: {
    backgroundColor: colors.accent + '44',
    color: colors.accent,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.sm,
  },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const achievements = use$(achievementsStore$.achievements);
  const isLoading = use$(achievementsStore$.isLoading);
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('all');

  useEffect(() => {
    fetchAchievements();
  }, []);

  const filtered =
    activeCategory === 'all'
      ? achievements
      : achievements.filter((a) => a.category === activeCategory);

  // Sort: unlocked first, then locked sorted by progress descending
  // (so users see what's "almost done" right after their wins)
  const unlocked = filtered.filter((a) => a.isUnlocked);
  const locked = filtered
    .filter((a) => !a.isUnlocked)
    .sort((a, b) => {
      const ap = a.threshold > 0 ? (a.currentValue ?? 0) / a.threshold : 0;
      const bp = b.threshold > 0 ? (b.currentValue ?? 0) / b.threshold : 0;
      return bp - ap;
    });
  const sorted = [...unlocked, ...locked];

  const totalUnlocked = achievements.filter((a) => a.isUnlocked).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <PixelButton title={T.ach_back} onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>{T.ach_title}</Text>
        <Text style={styles.counter}>
          {totalUnlocked}/{achievements.length}
        </Text>
      </View>

      {/* Progress summary */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryTrack}>
          <View
            style={[
              styles.summaryFill,
              {
                width: achievements.length > 0
                  ? `${(totalUnlocked / achievements.length) * 100}%`
                  : '0%',
              },
            ]}
          />
        </View>
        <Text style={styles.summaryLabel}>
          {achievements.length > 0
            ? Math.round((totalUnlocked / achievements.length) * 100)
            : 0}{T.ach_progress}
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORY_KEYS.map((key) => {
          const count =
            key === 'all'
              ? achievements.length
              : achievements.filter((a) => a.category === key).length;
          if (key !== 'all' && count === 0) return null;

          return (
            <Pressable
              key={key}
              style={[
                styles.filterChip,
                activeCategory === key && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory(key)}
            >
              <Text style={styles.filterIcon}>{CATEGORY_ICONS[key]}</Text>
              <Text
                style={[
                  styles.filterLabel,
                  activeCategory === key && styles.filterLabelActive,
                ]}
              >
                {CATEGORY_LABELS[key]}
              </Text>
              <Text
                style={[
                  styles.filterCount,
                  activeCategory === key && styles.filterCountActive,
                ]}
              >
                {count}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xl }}
        />
      ) : sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{T.ach_empty}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <AchievementCard
              name={item.name}
              description={item.description}
              category={item.category}
              isUnlocked={item.isUnlocked}
              xpReward={item.xp_reward}
              goldReward={item.gold_reward}
              threshold={item.threshold}
              currentValue={item.currentValue}
            />
          )}
        />
      )}
    </View>
  );
}



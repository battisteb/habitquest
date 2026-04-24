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

const CATEGORIES = [
  { key: 'all', label: 'ALL', icon: '🏅' },
  { key: 'streak', label: 'STREAK', icon: '🔥' },
  { key: 'completion', label: 'DONE', icon: '✅' },
  { key: 'xp', label: 'XP', icon: '⭐' },
  { key: 'social', label: 'SOCIAL', icon: '👥' },
  { key: 'shop', label: 'SHOP', icon: '🛒' },
  { key: 'special', label: 'SPECIAL', icon: '🏆' },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]['key'];

export default function AchievementsScreen() {
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

  const unlocked = filtered.filter((a) => a.isUnlocked);
  const locked = filtered.filter((a) => !a.isUnlocked);
  const sorted = [...unlocked, ...locked];

  const totalUnlocked = achievements.filter((a) => a.isUnlocked).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <PixelButton title="Back" onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>ACHIEVEMENTS</Text>
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
            : 0}% complete
        </Text>
      </View>

      {/* Category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORIES.map((cat) => {
          const count =
            cat.key === 'all'
              ? achievements.length
              : achievements.filter((a) => a.category === cat.key).length;
          if (cat.key !== 'all' && count === 0) return null;

          return (
            <Pressable
              key={cat.key}
              style={[
                styles.filterChip,
                activeCategory === cat.key && styles.filterChipActive,
              ]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={styles.filterIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.filterLabel,
                  activeCategory === cat.key && styles.filterLabelActive,
                ]}
              >
                {cat.label}
              </Text>
              <Text
                style={[
                  styles.filterCount,
                  activeCategory === cat.key && styles.filterCountActive,
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
          <Text style={styles.emptyText}>No achievements in this category.</Text>
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



import { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
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

export default function AchievementsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const achievements = use$(achievementsStore$.achievements);
  const isLoading = use$(achievementsStore$.isLoading);

  useEffect(() => {
    fetchAchievements();
  }, []);

  const unlocked = achievements.filter((a) => a.isUnlocked);
  const locked = achievements.filter((a) => !a.isUnlocked);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PixelButton title="Back" onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>ACHIEVEMENTS</Text>
        <Text style={styles.counter}>
          {unlocked.length}/{achievements.length}
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={[...unlocked, ...locked]}
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
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
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
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
});

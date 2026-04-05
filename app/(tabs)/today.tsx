import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HabitList } from '../../src/features/habits/components/habit-list';
import { fetchHabits } from '../../src/features/habits/stores/habits-store';
import { DailyQuestsSection } from '../../src/features/daily-quests/components/daily-quests-section';
import { useStreakRiskNotification } from '../../src/features/notifications/hooks/use-streak-risk-notification';
import {
  getFreezesRemaining,
  isFreezeActiveToday,
  activateFreeze,
} from '../../src/features/habits/utils/streak-freeze';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [freezeActive, setFreezeActive] = useState(isFreezeActiveToday());
  const [freezesLeft, setFreezesLeft] = useState(getFreezesRemaining());

  useStreakRiskNotification();

  useEffect(() => {
    fetchHabits();
  }, []);

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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>TODAY</Text>
        <View style={styles.headerRight}>
          {(freezesLeft > 0 || freezeActive) && (
            <Pressable
              style={[styles.freezeButton, freezeActive && styles.freezeButtonActive]}
              onPress={handleFreeze}
              disabled={freezeActive}
            >
              <Text style={styles.freezeText}>
                {freezeActive ? 'REST DAY' : `REST (${freezesLeft})`}
              </Text>
            </Pressable>
          )}
          <Pressable style={styles.addButton} onPress={() => router.push('/habit/create')}>
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
        </View>
      </View>
      <DailyQuestsSection />
      <HabitList />
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  freezeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4FC3F7',
    backgroundColor: 'transparent',
  },
  freezeButtonActive: {
    backgroundColor: '#4FC3F7',
    borderColor: '#0288D1',
  },
  freezeText: {
    color: '#4FC3F7',
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
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
});

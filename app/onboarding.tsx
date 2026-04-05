import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../src/ui/components/pixel-button';
import { PixelInput } from '../src/ui/components/pixel-input';
import { createHabit } from '../src/features/habits/stores/habits-store';
import { storage } from '../src/lib/storage/mmkv';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';

const ONBOARDING_KEY = 'onboarding-completed';

export function hasCompletedOnboarding(): boolean {
  return storage.getString(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  storage.set(ONBOARDING_KEY, 'true');
}

const STEPS = [
  {
    title: 'Welcome, Adventurer!',
    body: 'HabitQuest turns your daily habits into an epic quest. Build streaks, earn XP, level up, and become a legend.',
  },
  {
    title: 'Daily Quests',
    body: 'Each habit is a quest. Complete them every day to build streaks. The longer your streak, the more XP you earn!',
  },
  {
    title: 'Rewards & Risks',
    body: 'Earn gold to buy cosmetics in the shop. But beware — breaking a streak costs you XP and gold!',
  },
  {
    title: 'Your First Quest',
    body: "Let's create your first habit to get started. You can always add more later.",
    isAction: true,
  },
];

const QUICK_HABITS = [
  { name: 'Drink 2L of water', category: 'health' },
  { name: 'Read for 20 minutes', category: 'learning' },
  { name: 'Exercise 30 minutes', category: 'fitness' },
  { name: 'Meditate 10 minutes', category: 'mindfulness' },
  { name: 'No social media before noon', category: 'productivity' },
];

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [customHabit, setCustomHabit] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const current = STEPS[step];

  async function handleFinish() {
    setIsCreating(true);
    try {
      if (selectedQuick !== null) {
        const h = QUICK_HABITS[selectedQuick];
        await createHabit(h.name, h.category);
      } else if (customHabit.trim()) {
        await createHabit(customHabit.trim(), 'general');
      }
      markOnboardingComplete();
      router.replace('/(tabs)/today');
    } catch {
      // Still navigate even if habit creation fails
      markOnboardingComplete();
      router.replace('/(tabs)/today');
    } finally {
      setIsCreating(false);
    }
  }

  function handleSkip() {
    markOnboardingComplete();
    router.replace('/(tabs)/today');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.xl }]}>
      {/* Progress dots */}
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === step && styles.dotActive, i < step && styles.dotDone]}
          />
        ))}
      </View>

      <Text style={styles.title}>{current.title}</Text>
      <Text style={styles.body}>{current.body}</Text>

      {current.isAction && (
        <View style={styles.actionSection}>
          {/* Quick picks */}
          <Text style={styles.sectionLabel}>QUICK PICK</Text>
          {QUICK_HABITS.map((h, i) => (
            <Pressable
              key={i}
              style={[styles.quickPick, selectedQuick === i && styles.quickPickSelected]}
              onPress={() => {
                setSelectedQuick(i);
                setCustomHabit('');
              }}
            >
              <Text
                style={[
                  styles.quickPickText,
                  selectedQuick === i && styles.quickPickTextSelected,
                ]}
              >
                {h.name}
              </Text>
            </Pressable>
          ))}

          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>
            OR CUSTOM
          </Text>
          <PixelInput
            label=""
            value={customHabit}
            onChangeText={(t) => {
              setCustomHabit(t);
              setSelectedQuick(null);
            }}
            placeholder="Type your own habit..."
          />
        </View>
      )}

      <View style={styles.actions}>
        {current.isAction ? (
          <PixelButton
            title={isCreating ? 'Creating...' : 'Start Your Quest!'}
            onPress={handleFinish}
            disabled={isCreating || (selectedQuick === null && !customHabit.trim())}
          />
        ) : (
          <PixelButton title="Next" onPress={() => setStep(step + 1)} />
        )}

        <PixelButton title="Skip" onPress={handleSkip} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  dotDone: {
    backgroundColor: colors.success,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionSection: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  quickPick: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
  },
  quickPickSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceLight,
  },
  quickPickText: {
    fontSize: fontSizes.md,
    color: colors.text,
  },
  quickPickTextSelected: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  actions: {
    gap: spacing.sm,
    paddingBottom: spacing.lg,
  },
});

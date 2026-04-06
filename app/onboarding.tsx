import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
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

// Visual intro slides shown before the habit-creation step
const SLIDES = [
  {
    emoji: '⚔️',
    title: 'YOUR QUEST BEGINS',
    body: 'HabitQuest turns your daily habits into epic adventures. Complete quests, earn XP, and level up your life.',
  },
  {
    emoji: '🔥',
    title: 'BUILD STREAKS',
    body: "Show up every day to keep your streak alive. Miss a day and your streak resets — but you can freeze it with a rest day.",
  },
  {
    emoji: '🏆',
    title: 'EARN REWARDS',
    body: 'Level up your hero, unlock themes and avatar cosmetics, and compete with friends on the leaderboard.',
  },
];

const STEPS = [
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
  // slideIndex: 0..SLIDES.length-1 → intro slides, SLIDES.length → action step
  const [slideIndex, setSlideIndex] = useState(0);
  const [customHabit, setCustomHabit] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isActionStep = slideIndex >= SLIDES.length;
  const currentSlide = !isActionStep ? SLIDES[slideIndex] : null;
  const isLastSlide = slideIndex === SLIDES.length - 1;

  const totalDots = SLIDES.length + STEPS.length;
  const currentDot = slideIndex;

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
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress dots */}
      <View style={styles.dots}>
        {Array.from({ length: totalDots }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentDot && styles.dotActive,
              i < currentDot && styles.dotDone,
            ]}
          />
        ))}
      </View>

      {!isActionStep && currentSlide !== null ? (
        <View style={styles.slideSection}>
          <Text style={styles.slideEmoji}>{currentSlide.emoji}</Text>
          <Text style={styles.slideTitle}>{currentSlide.title}</Text>
          <Text style={styles.body}>{currentSlide.body}</Text>

          <View style={styles.btnRow}>
            {slideIndex > 0 && (
              <PixelButton
                title="Back"
                onPress={() => setSlideIndex((s) => s - 1)}
                variant="ghost"
                style={{ flex: 1 }}
              />
            )}
            <PixelButton
              title={isLastSlide ? "LET'S GO" : 'Next'}
              onPress={() => setSlideIndex((s) => s + 1)}
              style={{ flex: 1 }}
            />
          </View>

          <Pressable onPress={handleSkip}>
            <Text style={styles.skip}>Skip intro</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.actionSection}>
          <Text style={styles.title}>Your First Quest</Text>
          <Text style={styles.body}>
            {"Let's create your first habit to get started. You can always add more later."}
          </Text>

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

          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>OR CUSTOM</Text>
          <PixelInput
            label=""
            value={customHabit}
            onChangeText={(t) => {
              setCustomHabit(t);
              setSelectedQuick(null);
            }}
            placeholder="Type your own habit..."
          />

          <View style={styles.actions}>
            <PixelButton
              title={isCreating ? 'Creating...' : 'Start Your Quest!'}
              onPress={handleFinish}
              disabled={isCreating || (selectedQuick === null && !customHabit.trim())}
            />
            <PixelButton title="Skip" onPress={handleSkip} variant="ghost" />
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
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
  // Intro slides
  slideSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  slideEmoji: {
    fontSize: 80,
    textAlign: 'center',
  },
  slideTitle: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  btnRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  skip: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textDecorationLine: 'underline',
  },
  // Action step
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
    marginTop: spacing.md,
  },
});

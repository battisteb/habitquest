import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../src/ui/components/pixel-button';
import { PixelInput } from '../src/ui/components/pixel-input';
import { PixelAvatar } from '../src/features/avatar/renderer/pixel-avatar';
import { createHabit } from '../src/features/habits/stores/habits-store';
import { saveAvatarConfig } from '../src/features/avatar/stores/avatar-config-store';
import { authStore$ } from '../src/features/auth/stores/auth-store';
import { storage } from '../src/lib/storage/mmkv';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';
import { useT } from '../src/lib/i18n';

const ONBOARDING_KEY = 'onboarding-completed';

export function hasCompletedOnboarding(): boolean {
  return storage.getString(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  storage.set(ONBOARDING_KEY, 'true');
}

const SLIDE_EMOJIS = ['⚔️', '🔥', '🏆'];

const QUICK_HABIT_CATEGORIES = ['health', 'learning', 'fitness', 'mindfulness', 'productivity'] as const;

// Skin tone swatches
const SKIN_SWATCHES = ['#f4c98a', '#e8a87c', '#d4845a', '#c46c3c', '#a0522d', '#7a3b1e', '#4a2810', '#fce4c8'];
// Hair color swatches
const HAIR_SWATCHES = ['#4a3728', '#1a1a1a', '#8B4513', '#DAA520', '#FF6B35', '#e94560', '#4B0082', '#2d5a1e', '#C0C0C0', '#f4c98a'];
// Eye color swatches
const EYE_SWATCHES = ['#1a1a2e', '#2d5a1e', '#4B6CB7', '#8B4513', '#e94560', '#4B0082', '#1a4a3a', '#DAA520'];

interface SwatchRowProps {
  label: string;
  swatches: string[];
  selected: string;
  onSelect: (c: string) => void;
}

function SwatchRow({ label, swatches, selected, onSelect }: SwatchRowProps) {
  const styles = createStyles();
  return (
    <View style={swatchStyles.section}>
      <Text style={swatchStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={swatchStyles.row}>
        {swatches.map((c) => (
          <Pressable
            key={c}
            onPress={() => onSelect(c)}
            style={[swatchStyles.swatch, { backgroundColor: c }, selected === c && swatchStyles.swatchSelected]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const swatchStyles = StyleSheet.create({
  section: { gap: 4 },
  label: { fontSize: 9, fontWeight: 'bold', color: colors.textMuted, letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  swatch: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: 'transparent' },
  swatchSelected: { borderColor: '#ffffff', borderWidth: 3 },
});

// Step indices: 0..2 → intro slides, 3 → avatar, 4 → first habit
const SLIDE_COUNT = 3;
const AVATAR_STEP = SLIDE_COUNT;
const HABIT_STEP = SLIDE_COUNT + 1;
const TOTAL_STEPS = SLIDE_COUNT + 2;

export default function OnboardingScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [slideIndex, setSlideIndex] = useState(0);
  const [customHabit, setCustomHabit] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Avatar colors
  const [skinColor, setSkinColor] = useState('#f4c98a');
  const [hairColor, setHairColor] = useState('#4a3728');
  const [eyeColor, setEyeColor] = useState('#1a1a2e');

  const slides = useMemo(
    () => [
      { emoji: SLIDE_EMOJIS[0], title: T.onb_slide1_title, body: T.onb_slide1_body },
      { emoji: SLIDE_EMOJIS[1], title: T.onb_slide2_title, body: T.onb_slide2_body },
      { emoji: SLIDE_EMOJIS[2], title: T.onb_slide3_title, body: T.onb_slide3_body },
    ],
    [T],
  );

  const quickHabits = useMemo(
    () => [
      { name: T.onb_quick_water, category: QUICK_HABIT_CATEGORIES[0] },
      { name: T.onb_quick_read, category: QUICK_HABIT_CATEGORIES[1] },
      { name: T.onb_quick_exercise, category: QUICK_HABIT_CATEGORIES[2] },
      { name: T.onb_quick_meditate, category: QUICK_HABIT_CATEGORIES[3] },
      { name: T.onb_quick_no_social, category: QUICK_HABIT_CATEGORIES[4] },
    ],
    [T],
  );

  const isIntroSlide = slideIndex < SLIDE_COUNT;
  const isAvatarStep = slideIndex === AVATAR_STEP;
  const isHabitStep = slideIndex === HABIT_STEP;
  const currentSlide = isIntroSlide ? slides[slideIndex] : null;
  const isLastIntroSlide = slideIndex === SLIDE_COUNT - 1;

  async function handleFinish() {
    setIsCreating(true);
    try {
      // Save avatar colors
      const userId = authStore$.user.get()?.id;
      await saveAvatarConfig(skinColor, hairColor, eyeColor, userId);

      // Create first habit
      if (selectedQuick !== null) {
        const h = quickHabits[selectedQuick];
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
        {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === slideIndex && styles.dotActive,
              i < slideIndex && styles.dotDone,
            ]}
          />
        ))}
      </View>

      {/* ── Intro slides ────────────────────────────────── */}
      {isIntroSlide && currentSlide !== null && (
        <View style={styles.slideSection}>
          <Text style={styles.slideEmoji}>{currentSlide.emoji}</Text>
          <Text style={styles.slideTitle}>{currentSlide.title}</Text>
          <Text style={styles.body}>{currentSlide.body}</Text>

          <View style={styles.btnRow}>
            {slideIndex > 0 && (
              <PixelButton
                title={T.onb_back}
                onPress={() => setSlideIndex((s) => s - 1)}
                variant="ghost"
                style={{ flex: 1 }}
              />
            )}
            <PixelButton
              title={isLastIntroSlide ? T.onb_meet_hero : T.onb_next}
              onPress={() => setSlideIndex((s) => s + 1)}
              style={{ flex: 1 }}
            />
          </View>

          <Pressable onPress={handleSkip}>
            <Text style={styles.skip}>{T.onb_skip_intro}</Text>
          </Pressable>
        </View>
      )}

      {/* ── Avatar customization step ────────────────────── */}
      {isAvatarStep && (
        <ScrollView
          contentContainerStyle={styles.avatarSection}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.slideTitle}>{T.onb_avatar_title}</Text>
          <Text style={styles.body}>{T.onb_avatar_body}</Text>

          {/* Live avatar preview */}
          <View style={styles.avatarPreview}>
            <PixelAvatar
              size={140}
              skinColor={skinColor}
              hairColor={hairColor}
              eyeColor={eyeColor}
            />
          </View>

          <SwatchRow label={T.onb_skin_label} swatches={SKIN_SWATCHES} selected={skinColor} onSelect={setSkinColor} />
          <SwatchRow label={T.onb_hair_label} swatches={HAIR_SWATCHES} selected={hairColor} onSelect={setHairColor} />
          <SwatchRow label={T.onb_eye_label} swatches={EYE_SWATCHES} selected={eyeColor} onSelect={setEyeColor} />

          <View style={styles.btnRow}>
            <PixelButton
              title={T.onb_back}
              onPress={() => setSlideIndex((s) => s - 1)}
              variant="ghost"
              style={{ flex: 1 }}
            />
            <PixelButton
              title={T.onb_first_quest}
              onPress={() => setSlideIndex(HABIT_STEP)}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      )}

      {/* ── First habit creation step ────────────────────── */}
      {isHabitStep && (
        <ScrollView
          contentContainerStyle={styles.actionSection}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>{T.onb_habit_title}</Text>
          <Text style={styles.body}>{T.onb_habit_body}</Text>

          {/* Quick picks */}
          <Text style={styles.sectionLabel}>{T.onb_quick_pick}</Text>
          {quickHabits.map((h, i) => (
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

          <Text style={[styles.sectionLabel, { marginTop: spacing.md }]}>{T.onb_or_custom}</Text>
          <PixelInput
            label=""
            value={customHabit}
            onChangeText={(t) => {
              setCustomHabit(t);
              setSelectedQuick(null);
            }}
            placeholder={T.onb_habit_placeholder}
          />

          <View style={styles.actions}>
            <PixelButton
              title={T.onb_back}
              onPress={() => setSlideIndex(AVATAR_STEP)}
              variant="ghost"
            />
            <PixelButton
              title={isCreating ? T.onb_creating : T.onb_start_quest}
              onPress={handleFinish}
              disabled={isCreating || (selectedQuick === null && !customHabit.trim())}
            />
            <PixelButton title={T.onb_skip} onPress={handleSkip} variant="ghost" />
          </View>
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
}

function createStyles() {
  return StyleSheet.create({
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
  // Avatar step
  avatarSection: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarPreview: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  // Habit step
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
    gap: spacing.xs,
    paddingBottom: spacing.xxl,
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
}

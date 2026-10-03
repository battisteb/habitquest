import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../src/ui/components/pixel-button';
import { PixelInput } from '../../../src/ui/components/pixel-input';
import { ContentPicker } from '../../../src/features/habits/components/content-picker';
import { EmojiPicker } from '../../../src/features/habits/components/emoji-picker';
import { habitsStore$, updateHabit } from '../../../src/features/habits/stores/habits-store';
import { HABIT_CATEGORIES, CATEGORY_CONFIG, type HabitCategory } from '../../../src/lib/constants/categories';
import type { HabitContent } from '../../../src/features/habits/types/habit-content';
import { colors, spacing, fontSizes, borderRadius, fonts, pixelSize } from '../../../src/ui/theme/tokens';
import { useTheme } from '../../../src/ui/theme/theme-context';
import { useT } from '../../../src/lib/i18n';
import { categoryLabel } from '../../../src/lib/i18n/labels';
import { DayPicker } from '../../../src/features/habits/components/day-picker';
import { MotivationFields, cleanMotivation } from '../../../src/features/habits/components/motivation-fields';
import { defaultDays, scheduleToSave } from '../../../src/features/habits/utils/schedule';

export default function EditHabitScreen() {
  const T = useT();
  const { themeKey } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm },
  backButton: {
    color: colors.primary,
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  title: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 2,
  },
  categorySection: { gap: spacing.sm },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  categoryChipText: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
  saveButton: { marginTop: spacing.md },
  frequencySection: { gap: spacing.sm },
  frequencyLabel: {
    color: colors.textSecondary,
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  frequencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  frequencyChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  frequencyChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  frequencyChipText: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1, color: colors.textSecondary },
  frequencyChipTextActive: { color: colors.primary },
}), [themeKey]);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const habits = use$(habitsStore$.habits);
  const habit = habits.find((h) => h.id === id);

  const [name, setName] = useState(habit?.name ?? '');
  const [category, setCategory] = useState<HabitCategory>(
    (habit?.category as HabitCategory) ?? 'general',
  );
  const [content, setContent] = useState<HabitContent | null>(
    (habit?.content as HabitContent | null) ?? null,
  );
  const [frequency, setFrequency] = useState(habit?.frequency ?? 'daily');
  const [days, setDays] = useState<number[]>(habit?.days ?? defaultDays(habit?.frequency));
  // Every day, chosen days, and an older "N times a week" quest keeps its option.
  const legacyPerWeek = /^(\d)x_week$/.exec(habit?.frequency ?? '');
  const frequencyOptions = [
    { value: 'daily', label: T.habit_edit_freq_daily },
    { value: 'days', label: T.habit_create_some_days },
    ...(legacyPerWeek
      ? [{ value: legacyPerWeek[0], label: T.habit_freq_per_week.replace('{n}', legacyPerWeek[1]) }]
      : []),
  ];
  const [emoji, setEmoji] = useState<string | null>((habit as any)?.emoji ?? null);
  const [why, setWhy] = useState(habit?.why ?? '');
  const [anchor, setAnchor] = useState(habit?.anchor ?? '');
  const [mini, setMini] = useState(habit?.mini ?? '');
  const [loading, setLoading] = useState(false);

  if (!habit) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.title}>{T.habit_edit_not_found}</Text>
      </View>
    );
  }

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const schedule = frequency === 'days' ? scheduleToSave(days) : { frequency, days: null };
      await updateHabit(habit.id, {
        name: name.trim(),
        category,
        content,
        emoji,
        why: cleanMotivation(why),
        anchor: cleanMotivation(anchor),
        mini: cleanMotivation(mini),
        ...schedule,
      });
      router.back();
    } catch (e: unknown) {
      Alert.alert(T.habit_edit_error_title, e instanceof Error ? e.message : T.habit_edit_error_msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>{T.habit_edit_back}</Text>
        </Pressable>
        <Text style={styles.title}>{T.habit_edit_title}</Text>
      </View>

      <PixelInput
        label={T.habit_edit_name_label}
        value={name}
        onChangeText={setName}
      />

      <View style={styles.categorySection}>
        <Text style={styles.categoryLabel}>{T.habit_edit_category}</Text>
        <View style={styles.categoryGrid}>
          {HABIT_CATEGORIES.map((cat) => {
            const config = CATEGORY_CONFIG[cat];
            return (
              <Pressable
                key={cat}
                style={[
                  styles.categoryChip,
                  {
                    borderColor: category === cat ? config.color : colors.border,
                    backgroundColor: category === cat ? config.color + '22' : colors.surface,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    { color: category === cat ? config.color : colors.textSecondary },
                  ]}
                >
                  {config.icon} {categoryLabel(T, cat).toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.frequencySection}>
        <Text style={styles.frequencyLabel}>{T.habit_edit_frequency}</Text>
        <View style={styles.frequencyRow}>
          {frequencyOptions.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.frequencyChip,
                frequency === opt.value && styles.frequencyChipActive,
              ]}
              onPress={() => setFrequency(opt.value)}
              testID={`freq-${opt.value}`}
            >
              <Text
                style={[
                  styles.frequencyChipText,
                  frequency === opt.value && styles.frequencyChipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {frequency === 'days' && <DayPicker value={days} onChange={setDays} />}
      </View>

      <MotivationFields why={why} anchor={anchor} onWhyChange={setWhy} onAnchorChange={setAnchor} mini={mini} onMiniChange={setMini} />

      <EmojiPicker value={emoji} onChange={setEmoji} label={T.habit_edit_emoji} />

      <ContentPicker value={content} onChange={setContent} />

      <PixelButton
        title={T.habit_edit_save}
        onPress={handleSave}
        disabled={loading || !name.trim()}
        style={styles.saveButton}
      />
    </ScrollView>
  );
}

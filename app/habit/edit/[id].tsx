import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../src/ui/components/pixel-button';
import { PixelInput } from '../../../src/ui/components/pixel-input';
import { ContentPicker } from '../../../src/features/habits/components/content-picker';
import { habitsStore$, updateHabit } from '../../../src/features/habits/stores/habits-store';
import { HABIT_CATEGORIES, CATEGORY_CONFIG, type HabitCategory } from '../../../src/lib/constants/categories';
import type { HabitContent } from '../../../src/features/habits/types/habit-content';
import { colors, spacing, fontSizes, borderRadius } from '../../../src/ui/theme/tokens';
import { useTheme } from '../../../src/ui/theme/theme-context';
import { useT } from '../../../src/lib/i18n';

export default function EditHabitScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const FREQUENCY_OPTIONS = useMemo(() => [
    { value: 'daily', label: T.habit_edit_freq_daily },
    { value: '2x_week', label: T.habit_edit_freq_2x },
    { value: '3x_week', label: T.habit_edit_freq_3x },
    { value: '4x_week', label: T.habit_edit_freq_4x },
    { value: '5x_week', label: T.habit_edit_freq_5x },
  ], [T]);

  const styles = useMemo(() => StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  content: { padding: spacing.lg, gap: spacing.lg },
  header: { gap: spacing.sm },
  backButton: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  categorySection: { gap: spacing.sm },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  categoryChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  categoryChipText: { fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1 },
  saveButton: { marginTop: spacing.md },
  frequencySection: { gap: spacing.sm },
  frequencyLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
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
  frequencyChipText: { fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1, color: colors.textSecondary },
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
      await updateHabit(habit.id, { name: name.trim(), category, content, frequency });
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
                  {config.icon} {config.label.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.frequencySection}>
        <Text style={styles.frequencyLabel}>{T.habit_edit_frequency}</Text>
        <View style={styles.frequencyRow}>
          {FREQUENCY_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[
                styles.frequencyChip,
                frequency === opt.value && styles.frequencyChipActive,
              ]}
              onPress={() => setFrequency(opt.value)}
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
      </View>

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

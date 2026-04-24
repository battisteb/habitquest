import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelInput } from '../../src/ui/components/pixel-input';
import { ContentPicker } from '../../src/features/habits/components/content-picker';
import { createHabit } from '../../src/features/habits/stores/habits-store';
import { HABIT_CATEGORIES, CATEGORY_CONFIG, type HabitCategory } from '../../src/lib/constants/categories';
import type { HabitContent } from '../../src/features/habits/types/habit-content';
import { colors, spacing, fontSizes, borderRadius } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'daily', label: 'DAILY' },
  { value: '2x_week', label: '2×/WK' },
  { value: '3x_week', label: '3×/WK' },
  { value: '4x_week', label: '4×/WK' },
  { value: '5x_week', label: '5×/WK' },
];

export default function CreateHabitScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
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
  categorySection: {
    gap: spacing.sm,
  },
  categoryLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
  },
  categoryChipText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  createButton: {
    marginTop: spacing.md,
  },
  trainingShortcut: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
    alignItems: 'center',
  },
  trainingShortcutText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  frequencySection: {
    gap: spacing.sm,
  },
  frequencyLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  frequencyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
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
  frequencyChipText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
    color: colors.textSecondary,
  },
  frequencyChipTextActive: {
    color: colors.primary,
  },
}), [themeKey]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('general');
  const [content, setContent] = useState<HabitContent | null>(null);
  const [frequency, setFrequency] = useState('daily');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createHabit(name.trim(), category, content, frequency);
      router.back();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create habit';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>{'< BACK'}</Text>
        </Pressable>
        <Text style={styles.title}>NEW QUEST</Text>
      </View>

      <PixelInput
        label="Quest name"
        placeholder="e.g. Morning run, Read 30 min..."
        value={name}
        onChangeText={setName}
      />

      <View style={styles.categorySection}>
        <Text style={styles.categoryLabel}>CATEGORY</Text>
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
        <Text style={styles.frequencyLabel}>FREQUENCY</Text>
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

      {(category === 'fitness' || category === 'learning') && (
        <Pressable
          onPress={() => router.push('/(tabs)/training')}
          style={styles.trainingShortcut}
        >
          <Text style={styles.trainingShortcutText}>
            {category === 'fitness' ? '🏋️ Gérer mes séances →' : '📚 Gérer mes decks Anki →'}
          </Text>
        </Pressable>
      )}

      <PixelButton
        title="Create quest"
        onPress={handleCreate}
        disabled={loading || !name.trim()}
        style={styles.createButton}
      />
    </ScrollView>
  );
}



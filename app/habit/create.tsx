import { useState } from 'react';
import { View, Text, StyleSheet, Alert, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelInput } from '../../src/ui/components/pixel-input';
import { createHabit } from '../../src/features/habits/stores/habits-store';
import { HABIT_CATEGORIES, CATEGORY_CONFIG, type HabitCategory } from '../../src/lib/constants/categories';
import { colors, spacing, fontSizes, borderRadius } from '../../src/ui/theme/tokens';

export default function CreateHabitScreen() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<HabitCategory>('general');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleCreate = async () => {
    if (!name.trim()) return;

    setLoading(true);
    try {
      await createHabit(name.trim(), category);
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

      <PixelButton
        title="Create quest"
        onPress={handleCreate}
        disabled={loading || !name.trim()}
        style={styles.createButton}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});

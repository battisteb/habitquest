import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { supabase } from '../../src/lib/supabase/client';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { unarchiveHabit, deleteHabitPermanently } from '../../src/features/habits/stores/habits-store';
import { getCategoryColor } from '../../src/lib/constants/categories';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import type { Database } from '../../src/lib/supabase/types';

type Habit = Database['public']['Tables']['habits']['Row'];

export default function HabitArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [archived, setArchived] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchived();
  }, []);

  async function loadArchived() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', userId)
      .eq('is_archived', true)
      .order('created_at', { ascending: false });
    setArchived((data as Habit[]) ?? []);
    setLoading(false);
  }

  async function handleRestore(habit: Habit) {
    await unarchiveHabit(habit.id);
    setArchived((prev) => prev.filter((h) => h.id !== habit.id));
  }

  async function handleDelete(habit: Habit) {
    Alert.alert(
      'Delete permanently',
      `Delete "${habit.name}" and all its completion history? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteHabitPermanently(habit.id);
            setArchived((prev) => prev.filter((h) => h.id !== habit.id));
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>ARCHIVE</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : archived.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyText}>No archived habits</Text>
        </View>
      ) : (
        <FlatList
          data={archived}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const color = getCategoryColor(item.category);
            return (
              <View style={styles.card}>
                <View style={[styles.categoryBar, { backgroundColor: color }]} />
                <View style={styles.cardContent}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.habitName} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.habitCategory, { color }]}>
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <PixelButton
                      title="Restore"
                      onPress={() => handleRestore(item)}
                      variant="secondary"
                      style={styles.actionBtn}
                    />
                    <PixelButton
                      title="Delete"
                      onPress={() => handleDelete(item)}
                      variant="ghost"
                      style={styles.actionBtn}
                    />
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    overflow: 'hidden',
    opacity: 0.8,
  },
  categoryBar: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  cardInfo: {
    gap: 2,
  },
  habitName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  habitCategory: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  actionBtn: {
    flex: 1,
    paddingHorizontal: spacing.sm,
  },
});

import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HabitList } from '../../src/features/habits/components/habit-list';
import { fetchHabits } from '../../src/features/habits/stores/habits-store';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  useEffect(() => {
    fetchHabits();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>TODAY</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/habit/create')}>
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>
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

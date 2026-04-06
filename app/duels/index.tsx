import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { duelStore$, fetchUnlockedCategories, fetchDuels, getWeeklyDuelsUsed } from '../../src/features/duels/stores/duel-store';
import { getUnlockedAttacks } from '../../src/features/duels/utils/attacks';

export default function DuelsIndexScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const attacks = getUnlockedAttacks(unlockedCategories);
  const [weeklyUsed, setWeeklyUsed] = useState(0);

  useEffect(() => {
    fetchUnlockedCategories();
    fetchDuels();
    getWeeklyDuelsUsed().then((n) => setWeeklyUsed(n));
  }, []);

  const limitReached = weeklyUsed >= 2;

  const badgeColor =
    weeklyUsed === 0
      ? colors.success
      : weeklyUsed === 1
      ? colors.warning
      : colors.danger;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>DUELS</Text>
          <View style={[styles.weeklyBadge, { borderColor: badgeColor }]}>
            <Text style={[styles.weeklyBadgeText, { color: badgeColor }]}>
              {weeklyUsed}/2 this week
            </Text>
          </View>
        </View>
        <Text style={styles.sub}>Challenge friends to turn-based combat</Text>
        <Text style={styles.resetNote}>Resets every Monday</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>YOUR ATTACKS ({attacks.length})</Text>
        <FlatList
          data={attacks}
          keyExtractor={(a) => a.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item: a }) => (
            <View style={styles.attackChip}>
              <Text style={styles.attackEmoji}>{a.emoji}</Text>
              <Text style={styles.attackName}>{a.name}</Text>
              <Text style={styles.attackStats}>DMG {a.baseDamage} · {Math.round(a.hitChance * 100)}%</Text>
            </View>
          )}
        />
        {attacks.length <= 1 && (
          <Text style={styles.hint}>Complete habits (7+ times) to unlock more attacks!</Text>
        )}
      </View>

      {limitReached ? (
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>WEEKLY LIMIT REACHED</Text>
          <Text style={styles.lockedMessage}>
            Come back next Monday — 2 duels used this week
          </Text>
        </View>
      ) : (
        <PixelButton
          title="Challenge a Friend"
          onPress={() => router.push('/duels/challenge')}
          style={styles.challengeBtn}
        />
      )}

      <PixelButton
        title="Duel Simulator (Demo)"
        onPress={() => router.push('/duels/result')}
        variant="ghost"
        style={styles.simBtn}
      />

      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>HOW IT WORKS</Text>
        <Text style={styles.howText}>1. Challenge a friend to a duel</Text>
        <Text style={styles.howText}>2. Each player picks an attack (daily)</Text>
        <Text style={styles.howText}>3. Attacks resolve — higher level has better odds</Text>
        <Text style={styles.howText}>4. First to 0 HP loses — both get rewards!</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  header: { gap: 4, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: fontSizes.xxl, fontWeight: 'bold', color: colors.text, letterSpacing: 2 },
  weeklyBadge: {
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  weeklyBadgeText: { fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1 },
  sub: { fontSize: fontSizes.sm, color: colors.textMuted },
  resetNote: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  attackChip: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 80,
    gap: 2,
  },
  attackEmoji: { fontSize: 24 },
  attackName: { color: colors.text, fontSize: fontSizes.xs, fontWeight: 'bold', textAlign: 'center' },
  attackStats: { color: colors.textMuted, fontSize: 9, letterSpacing: 0.5 },
  hint: { color: colors.textMuted, fontSize: fontSizes.xs, fontStyle: 'italic', marginTop: spacing.sm },
  lockedContainer: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: 6,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  lockedIcon: { fontSize: 28 },
  lockedTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.danger,
    letterSpacing: 2,
  },
  lockedMessage: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  challengeBtn: { marginBottom: spacing.sm },
  simBtn: { marginBottom: spacing.lg },
  howItWorks: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.md,
    gap: spacing.xs,
  },
  howTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  howText: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 },
});

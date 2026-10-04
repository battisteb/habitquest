import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { duelStore$, fetchUnlockedCategories, fetchDuels } from '../../src/features/duels/stores/duel-store';
import { getUnlockedAttacks, nextLevelAttack } from '../../src/features/duels/utils/attacks';
import { profileStore$ } from '../../src/features/gamification/stores/profile-store';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';
import { attackName } from '../../src/lib/i18n/labels';

export default function DuelsIndexScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  backButton: { marginBottom: spacing.sm },
  backButtonText: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 1 },
  header: { gap: 4, marginBottom: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { fontSize: pixelSize(fontSizes.xxl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
  weeklyBadge: {
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  weeklyBadgeText: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
  sub: { fontSize: fontSizes.sm, color: colors.textMuted },
  resetNote: { fontSize: 10, color: colors.textMuted, fontStyle: 'italic' },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  attackChip: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 80,
    gap: 2,
  },
  attackEmoji: { fontSize: 24 },
  attackName: { color: colors.text, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, textAlign: 'center' },
  attackStats: { color: colors.textMuted, fontSize: 9, letterSpacing: 0.5 },
  hint: { color: colors.textMuted, fontSize: fontSizes.xs, fontStyle: 'italic', marginTop: spacing.sm },
  lockedContainer: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: 0,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  lockedIcon: { fontSize: 28 },
  lockedTitle: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
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
    borderRadius: 0,
    padding: spacing.md,
    gap: spacing.xs,
  },
  howTitle: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.accent,
    letterSpacing: 2,
    marginBottom: 4,
  },
  howText: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const level = use$(profileStore$.profile)?.level ?? 1;
  const attacks = getUnlockedAttacks(unlockedCategories, level);
  const next = nextLevelAttack(level);
  useEffect(() => {
    fetchUnlockedCategories();
    fetchDuels();
  }, []);

  // No full-screen ad before a duel (D9): it would spoil a moment with a friend.
  function handleChallengeFriend() {
    router.push('/duels/challenge');
  }

  function handleQuickBattle() {
    router.push('/duels/battle');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>{T.duels_back}</Text>
      </Pressable>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{T.duels_title}</Text>
          <View style={[styles.weeklyBadge, { borderColor: colors.success }]}>
            <Text style={[styles.weeklyBadgeText, { color: colors.success }]}>{T.duels_friendly_badge}</Text>
          </View>
        </View>
        <Text style={styles.sub}>{T.duels_subtitle}</Text>
        <Text style={styles.resetNote}>{T.duels_friendly_note}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.duels_section_attacks.replace('{n}', String(attacks.length))}</Text>
        <FlatList
          data={attacks}
          keyExtractor={(a) => a.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm }}
          renderItem={({ item: a }) => (
            <View style={styles.attackChip}>
              <Text style={styles.attackEmoji}>{a.emoji}</Text>
              <Text style={styles.attackName}>{attackName(T, a)}</Text>
              <Text style={styles.attackStats}>DMG {a.baseDamage} · {Math.round(a.hitChance * 100)}%</Text>
            </View>
          )}
        />
        <Text style={styles.hint}>
          {next
            ? T.duels_next_attack.replace('{level}', String(next.minLevel)).replace('{name}', attackName(T, next))
            : T.duels_attacks_hint}
        </Text>
      </View>

      <PixelButton
        title={T.duels_btn_challenge}
        onPress={handleChallengeFriend}
        style={styles.challengeBtn}
      />

      <PixelButton
        title={T.duels_btn_quick}
        onPress={handleQuickBattle}
        variant="ghost"
        style={styles.simBtn}
      />

      <View style={styles.howItWorks}>
        <Text style={styles.howTitle}>{T.duels_how_title}</Text>
        <Text style={styles.howText}>{T.duels_how_1}</Text>
        <Text style={styles.howText}>{T.duels_how_2}</Text>
        <Text style={styles.howText}>{T.duels_how_3}</Text>
        <Text style={styles.howText}>{T.duels_how_4}</Text>
      </View>
    </View>
  );
}



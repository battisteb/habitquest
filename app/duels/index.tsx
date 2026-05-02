import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { duelStore$, fetchUnlockedCategories, fetchDuels, getWeeklyDuelsUsed } from '../../src/features/duels/stores/duel-store';
import { getUnlockedAttacks } from '../../src/features/duels/utils/attacks';
import { usePremium } from '../../src/features/monetization/hooks/use-premium';
import { showInterstitial } from '../../src/features/monetization/utils/ad-service';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';

export default function DuelsIndexScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  backButton: { marginBottom: spacing.sm },
  backButtonText: { fontSize: fontSizes.sm, fontWeight: 'bold', color: colors.textSecondary, letterSpacing: 1 },
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
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const attacks = getUnlockedAttacks(unlockedCategories);
  const [weeklyUsed, setWeeklyUsed] = useState(0);
  const { isPremium, canStartDuel, duelCooldownRemainingMinutes, duelCooldownHours, openPaywall } = usePremium();
  const { profile } = useProfileStats();
  const lastDuelAt = (profile as any)?.last_duel_at ?? null;

  useEffect(() => {
    fetchUnlockedCategories();
    fetchDuels();
    getWeeklyDuelsUsed().then((n) => setWeeklyUsed(n));
  }, []);

  const cooldownOk = canStartDuel(lastDuelAt);
  const cooldownMinutes = duelCooldownRemainingMinutes(lastDuelAt);
  const cooldownHours = Math.ceil(cooldownMinutes / 60);

  // Legacy weekly limit for free users (3 per week = at most 1 every 2 days + max 3)
  const weeklyLimitReached = !isPremium && weeklyUsed >= 3;
  const limitReached = !cooldownOk || weeklyLimitReached;

  const badgeColor =
    weeklyUsed === 0
      ? colors.success
      : weeklyUsed < 3
      ? colors.warning
      : colors.danger;

  function handleChallengeFriend() {
    showInterstitial(() => router.push('/duels/challenge'));
  }

  function handleQuickBattle() {
    showInterstitial(() => router.push('/duels/battle'));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backButtonText}>{T.duels_back}</Text>
      </Pressable>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{T.duels_title}</Text>
          <View style={[styles.weeklyBadge, { borderColor: badgeColor }]}>
            <Text style={[styles.weeklyBadgeText, { color: badgeColor }]}>
              {isPremium
                ? T.duels_week_count.replace('{n}', String(weeklyUsed))
                : T.duels_week_count_limit.replace('{n}', String(weeklyUsed))}
            </Text>
          </View>
        </View>
        <Text style={styles.sub}>{T.duels_subtitle}</Text>
        <Text style={styles.resetNote}>{T.duels_reset_note}</Text>
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
              <Text style={styles.attackName}>{a.name}</Text>
              <Text style={styles.attackStats}>DMG {a.baseDamage} · {Math.round(a.hitChance * 100)}%</Text>
            </View>
          )}
        />
        {attacks.length <= 1 && (
          <Text style={styles.hint}>{T.duels_attacks_hint}</Text>
        )}
      </View>

      {limitReached ? (
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedIcon}>🔒</Text>
          <Text style={styles.lockedTitle}>
            {weeklyLimitReached ? T.duels_locked_weekly : T.duels_locked_cooldown}
          </Text>
          <Text style={styles.lockedMessage}>
            {weeklyLimitReached
              ? T.duels_locked_weekly_msg
              : T.duels_locked_cooldown_msg
                  .replace('{h}', String(cooldownHours))
                  .replace('{hh}', String(duelCooldownHours))}
          </Text>
          {!isPremium && (
            <PixelButton
              title={T.duels_premium_cta}
              onPress={openPaywall}
              variant="secondary"
              style={{ marginTop: spacing.sm }}
            />
          )}
        </View>
      ) : (
        <PixelButton
          title={T.duels_btn_challenge}
          onPress={handleChallengeFriend}
          style={styles.challengeBtn}
        />
      )}

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



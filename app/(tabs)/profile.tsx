import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { useT } from '../../src/lib/i18n';
import { PixelFrame } from '../../src/ui/components/pixel-frame';
import { PixelProgress } from '../../src/ui/components/pixel-progress';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../../src/features/gamification/components/xp-bar';
import { HeroStage } from '../../src/features/avatar/components/hero-stage';
import { AvatarDisplay } from '../../src/features/avatar/components/avatar-display';
import { getAvatarStage, getNextAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';
import { shopStore$, fetchShop } from '../../src/features/shop/stores/shop-store';
import { avatarConfigStore$, loadAvatarConfig } from '../../src/features/avatar/stores/avatar-config-store';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { notificationsStore$ } from '../../src/features/notifications/stores/notifications-store';
import { duelStore$, fetchDuels } from '../../src/features/duels/stores/duel-store';
import { MonthlyHeatmap } from '../../src/features/habits/components/monthly-heatmap';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { titleLabel, stageDescription } from '../../src/lib/i18n/labels';

export default function ProfileScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconBtnText: {
    fontSize: 22,
  },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderRadius: 0,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: pixelSize(9),
    fontFamily: fonts.bold,
    color: '#fff',
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  username: {
    fontSize: pixelSize(fontSizes.xxl),
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  rankBadge: {
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  editHint: {
    fontSize: 10,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHint: {
    color: colors.xp,
    fontSize: pixelSize(9),
    fontFamily: fonts.bold,
    letterSpacing: 1,
    textAlign: 'right',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStatFrame: { flex: 1 },
  miniStat: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniStatValue: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.accent,
  },
  miniStatLabel: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  stageCard: {
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stageInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  stageTitle: {
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
    letterSpacing: 2,
  },
  stageDescription: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  stageNext: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
}), [themeKey]);
  const { profile, xpForNextLevel, xpProgress, isLoading } = useProfileStats();
  const equippedSlots = use$(shopStore$.equippedSlots);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const skinColor = use$(avatarConfigStore$.skinColor);
  const hairColor = use$(avatarConfigStore$.hairColor);
  const eyeColor = use$(avatarConfigStore$.eyeColor);
  const unreadNotifications = use$(notificationsStore$.unreadCount);

  const resolvedDuels = use$(duelStore$.resolvedDuels);
  const currentUserId = use$(authStore$.user)?.id;
  const duelsWon = resolvedDuels.filter(d => d.winnerId === currentUserId).length;
  const duelsLost = resolvedDuels.filter(d => d.winnerId !== currentUserId && d.winnerId !== null).length;

  useEffect(() => {
    fetchShop();
    fetchDuels();
    loadAvatarConfig(authStore$.user.get()?.id);
  }, []);

  const level = profile?.level ?? 1;
  const rank = getRankForLevel(level);
  const avatarStage = getAvatarStage(level);
  const nextAvatarStage = getNextAvatarStage(level);
  const equippedHat = equippedSlots?.hat?.item?.sprite_key;
  const equippedOutfit = equippedSlots?.outfit?.item?.sprite_key;
  const equippedAccessory = equippedSlots?.accessory?.item?.sprite_key;
  const equippedBg = equippedSlots?.background?.item?.sprite_key;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {/* Top icon bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.push('/settings')} style={styles.iconBtn} hitSlop={8}>
          <Text style={styles.iconBtnText}>⚙️</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/notifications')} style={styles.iconBtn} hitSlop={8}>
          <Text style={styles.iconBtnText}>🔔</Text>
          {unreadNotifications > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            {/* Clickable avatar → edit profile */}
            <Pressable style={styles.avatarSection} onPress={() => router.push('/profile/edit')}>
              <HeroStage
                level={profile?.level ?? 1}
                size={180}
                hat={equippedHat}
                outfit={equippedOutfit}
                accessory={equippedAccessory}
                background={equippedBg}
                skinColor={skinColor}
                hairColor={hairColor}
                eyeColor={eyeColor}
              />
              <Text style={styles.username}>{profile?.username ?? 'Adventurer'}</Text>
              <Text style={[styles.rankBadge, { color: rank.color }]}>{titleLabel(T, rank.name)}</Text>
              <Text style={styles.editHint}>{T.profile_edit_hint}</Text>
            </Pressable>

            {/* Avatar evolution stage */}
            <PixelFrame borderColor={avatarStage.aura} backgroundColor={colors.surface} contentStyle={styles.stageCard}>
              <View style={styles.stageRow}>
                <AvatarDisplay level={level} size="sm" />
                <View style={styles.stageInfo}>
                  <Text style={[styles.stageTitle, { color: avatarStage.aura }]}>
                    {titleLabel(T, avatarStage.title).toUpperCase()}
                  </Text>
                  <Text style={styles.stageDescription}>{stageDescription(T, avatarStage.title, avatarStage.description)}</Text>
                </View>
              </View>
              {nextAvatarStage !== null && (
                <>
                  <PixelProgress
                    progress={(level - avatarStage.minLevel) / Math.max(nextAvatarStage.minLevel - avatarStage.minLevel, 1)}
                    color={nextAvatarStage.aura}
                    segments={10}
                    height={6}
                  />
                  <Text style={styles.stageNext}>
                    {T.profile_next_stage.replace('{title}', titleLabel(T, nextAvatarStage.title)).replace('{level}', String(nextAvatarStage.minLevel))}
                  </Text>
                </>
              )}
            </PixelFrame>

            {/* XP Bar */}
            <Pressable onPress={() => router.push('/xp-journey')}>
              <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
              <XpBar
                level={level}
                currentXp={profile?.xp ?? 0}
                nextLevelXp={xpForNextLevel}
                progress={xpProgress}
              />
              <Text style={styles.cardHint}>{T.profile_xp_journey_hint}</Text>
              </PixelFrame>
            </Pressable>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <PixelFrame style={styles.miniStatFrame} backgroundColor={colors.surface} contentStyle={styles.miniStat}>
                <Text style={styles.miniStatValue}>{profile?.xp ?? 0}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_xp}</Text>
              </PixelFrame>
              <PixelFrame style={styles.miniStatFrame} backgroundColor={colors.surface} contentStyle={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.xp }]}>{level}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_level}</Text>
              </PixelFrame>
              <PixelFrame style={styles.miniStatFrame} backgroundColor={colors.surface} contentStyle={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.accent }]}>
                  {profile?.gold ?? 0}
                </Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_gold}</Text>
              </PixelFrame>
            </View>

            {/* Duel stats */}
            <View style={styles.statsRow}>
              <PixelFrame style={styles.miniStatFrame} backgroundColor={colors.surface} contentStyle={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#4CAF50' }]}>{duelsWon}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_wins}</Text>
              </PixelFrame>
              <PixelFrame style={styles.miniStatFrame} backgroundColor={colors.surface} contentStyle={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#F44336' }]}>{duelsLost}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_losses}</Text>
              </PixelFrame>
              <PixelFrame style={styles.miniStatFrame} backgroundColor={colors.surface} contentStyle={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.streak }]}>
                  {duelsWon + duelsLost > 0
                    ? Math.round((duelsWon / (duelsWon + duelsLost)) * 100)
                    : 0}%
                </Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_win_rate}</Text>
              </PixelFrame>
            </View>

            {/* Monthly activity heatmap */}
            <MonthlyHeatmap />

            {/* Single action */}
            <PixelButton
              title={T.profile_achievements_btn}
              onPress={() => router.push('/achievements')}
              variant="secondary"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}



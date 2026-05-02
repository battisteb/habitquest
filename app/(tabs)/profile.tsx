import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { useT } from '../../src/lib/i18n';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../../src/features/gamification/components/xp-bar';
import { EvolvedAvatar } from '../../src/features/avatar/components/evolved-avatar';
import { AvatarDisplay } from '../../src/features/avatar/components/avatar-display';
import { getAvatarStage, getNextAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';
import { shopStore$, fetchShop } from '../../src/features/shop/stores/shop-store';
import { avatarConfigStore$, loadAvatarConfig } from '../../src/features/avatar/stores/avatar-config-store';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { notificationsStore$ } from '../../src/features/notifications/stores/notifications-store';
import { duelStore$, fetchDuels } from '../../src/features/duels/stores/duel-store';
import { MonthlyHeatmap } from '../../src/features/habits/components/monthly-heatmap';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

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
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
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
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  rankBadge: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
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
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHint: {
    color: colors.xp,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    textAlign: 'right',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniStatValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.accent,
  },
  miniStatLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  stageInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  stageTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  stageDescription: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  stageNext: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    letterSpacing: 0.5,
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
  const duelsWon = resolvedDuels.filter(d => d.winnerId === 'me').length;
  const duelsLost = resolvedDuels.filter(d => d.winnerId !== 'me' && d.winnerId !== null).length;

  useEffect(() => {
    fetchShop();
    fetchDuels();
    loadAvatarConfig(authStore$.user.get()?.id);
  }, []);

  const level = profile?.level ?? 0;
  const rank = getRankForLevel(level);
  const avatarStage = getAvatarStage(level);
  const nextAvatarStage = getNextAvatarStage(level);
  const equippedHat = equippedSlots?.hat?.item?.sprite_key;
  const equippedOutfit = equippedSlots?.outfit?.item?.sprite_key;
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
              <EvolvedAvatar
                level={profile?.level ?? 0}
                size={180}
                hat={equippedHat}
                outfit={equippedOutfit}
                background={equippedBg}
                skinColor={skinColor}
                hairColor={hairColor}
                eyeColor={eyeColor}
              />
              <Text style={styles.username}>{profile?.username ?? 'Adventurer'}</Text>
              <Text style={[styles.rankBadge, { color: rank.color }]}>{rank.name}</Text>
              <Text style={styles.editHint}>{T.profile_edit_hint}</Text>
            </Pressable>

            {/* Avatar evolution stage */}
            <View style={[styles.stageCard, { borderColor: avatarStage.aura }]}>
              <AvatarDisplay level={level} size="sm" />
              <View style={styles.stageInfo}>
                <Text style={[styles.stageTitle, { color: avatarStage.aura }]}>
                  {avatarStage.title}
                </Text>
                <Text style={styles.stageDescription}>{avatarStage.description}</Text>
                {nextAvatarStage !== null && (
                  <Text style={styles.stageNext}>
                    {T.profile_next_stage.replace('{title}', nextAvatarStage.title).replace('{level}', String(nextAvatarStage.minLevel))}
                  </Text>
                )}
              </View>
            </View>

            {/* XP Bar */}
            <Pressable style={styles.card} onPress={() => router.push('/xp-journey')}>
              <XpBar
                level={level}
                currentXp={profile?.xp ?? 0}
                nextLevelXp={xpForNextLevel}
                progress={xpProgress}
              />
              <Text style={styles.cardHint}>{T.profile_xp_journey_hint}</Text>
            </Pressable>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{profile?.xp ?? 0}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_xp}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.xp }]}>{level}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_level}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.accent }]}>
                  {profile?.gold ?? 0}
                </Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_gold}</Text>
              </View>
            </View>

            {/* Duel stats */}
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#4CAF50' }]}>{duelsWon}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_wins}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#F44336' }]}>{duelsLost}</Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_losses}</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.streak }]}>
                  {duelsWon + duelsLost > 0
                    ? Math.round((duelsWon / (duelsWon + duelsLost)) * 100)
                    : 0}%
                </Text>
                <Text style={styles.miniStatLabel}>{T.profile_stat_win_rate}</Text>
              </View>
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



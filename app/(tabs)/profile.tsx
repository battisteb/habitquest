import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../../src/features/gamification/components/xp-bar';
import { PixelAvatar } from '../../src/features/avatar/renderer/pixel-avatar';
import { AvatarDisplay } from '../../src/features/avatar/components/avatar-display';
import { getAvatarStage, getNextAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';
import { shopStore$, fetchShop } from '../../src/features/shop/stores/shop-store';
import { avatarConfigStore$, loadAvatarConfig } from '../../src/features/avatar/stores/avatar-config-store';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { notificationsStore$ } from '../../src/features/notifications/stores/notifications-store';
import { duelStore$, fetchDuels } from '../../src/features/duels/stores/duel-store';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function ProfileScreen() {
  const { profile, xpForNextLevel, xpProgress, isLoading } = useProfileStats();
  const equippedSlots = use$(shopStore$.equippedSlots);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [idleFrame, setIdleFrame] = useState(0);

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

  useEffect(() => {
    const interval = setInterval(() => setIdleFrame((f) => f + 1), 600);
    return () => clearInterval(interval);
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
              <PixelAvatar
                size={180}
                hat={equippedHat}
                outfit={equippedOutfit}
                background={equippedBg}
                idleFrame={idleFrame}
                skinColor={skinColor}
                hairColor={hairColor}
                eyeColor={eyeColor}
              />
              <Text style={styles.username}>{profile?.username ?? 'Adventurer'}</Text>
              <Text style={[styles.rankBadge, { color: rank.color }]}>{rank.name}</Text>
              <Text style={styles.editHint}>Appuie pour modifier →</Text>
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
                    {'Prochain : ' + nextAvatarStage.title + ' au Niveau ' + nextAvatarStage.minLevel}
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
              <Text style={styles.cardHint}>VOIR MON PARCOURS XP →</Text>
            </Pressable>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatValue}>{profile?.xp ?? 0}</Text>
                <Text style={styles.miniStatLabel}>XP</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.xp }]}>{level}</Text>
                <Text style={styles.miniStatLabel}>LEVEL</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.accent }]}>
                  {profile?.gold ?? 0}
                </Text>
                <Text style={styles.miniStatLabel}>GOLD</Text>
              </View>
            </View>

            {/* Duel stats */}
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#4CAF50' }]}>{duelsWon}</Text>
                <Text style={styles.miniStatLabel}>⚔️ WINS</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: '#F44336' }]}>{duelsLost}</Text>
                <Text style={styles.miniStatLabel}>💀 LOSSES</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={[styles.miniStatValue, { color: colors.streak }]}>
                  {duelsWon + duelsLost > 0
                    ? Math.round((duelsWon / (duelsWon + duelsLost)) * 100)
                    : 0}%
                </Text>
                <Text style={styles.miniStatLabel}>WIN RATE</Text>
              </View>
            </View>

            {/* Single action */}
            <PixelButton
              title="🏆 Succès"
              onPress={() => router.push('/achievements')}
              variant="secondary"
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
});

import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useAuth } from '../../src/features/auth/hooks/use-auth';
import { signOut } from '../../src/features/auth/stores/auth-store';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../../src/features/gamification/components/xp-bar';
import { PixelAvatar } from '../../src/features/avatar/renderer/pixel-avatar';
import { AvatarDisplay } from '../../src/features/avatar/components/avatar-display';
import { getAvatarStage, getNextAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';
import { shopStore$, fetchShop } from '../../src/features/shop/stores/shop-store';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { duelStore$, fetchDuels } from '../../src/features/duels/stores/duel-store';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, xpForNextLevel, xpProgress, isLoading } = useProfileStats();
  const equippedSlots = use$(shopStore$.equippedSlots);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [idleFrame, setIdleFrame] = useState(0);

  const resolvedDuels = use$(duelStore$.resolvedDuels);
  const duelsWon = resolvedDuels.filter(d => d.winnerId === 'me').length;
  const duelsLost = resolvedDuels.filter(d => d.winnerId !== 'me' && d.winnerId !== null).length;

  useEffect(() => {
    fetchShop();
    fetchDuels();
  }, []);

  // Idle animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIdleFrame((f) => f + 1);
    }, 600);
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
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <>
          {/* Avatar hero section */}
          <View style={styles.avatarSection}>
            <PixelAvatar
              size={220}
              hat={equippedHat}
              outfit={equippedOutfit}
              background={equippedBg}
              idleFrame={idleFrame}
            />

            <Text style={styles.username}>{profile?.username ?? 'Adventurer'}</Text>
            <Text style={[styles.rankBadge, { color: rank.color }]}>
              {rank.name}
            </Text>

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
                    {'Next: ' + nextAvatarStage.title + ' at Level ' + nextAvatarStage.minLevel}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* XP Bar — tap to open XP Journey */}
          <Pressable
            style={styles.card}
            onPress={() => router.push('/xp-journey')}
          >
            <XpBar
              level={level}
              currentXp={profile?.xp ?? 0}
              nextLevelXp={xpForNextLevel}
              progress={xpProgress}
            />
            <Text style={styles.cardHint}>TAP FOR XP JOURNEY →</Text>
          </Pressable>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{profile?.xp ?? 0}</Text>
              <Text style={styles.miniStatLabel}>XP</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: colors.xp }]}>
                {level}
              </Text>
              <Text style={styles.miniStatLabel}>LEVEL</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: colors.accent }]}>
                {profile?.gold ?? 0}
              </Text>
              <Text style={styles.miniStatLabel}>GOLD</Text>
            </View>
          </View>

          {/* Duel stats row */}
          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: '#4CAF50' }]}>
                {duelsWon}
              </Text>
              <Text style={styles.miniStatLabel}>⚔️ WINS</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: '#F44336' }]}>
                {duelsLost}
              </Text>
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

          {/* Quick actions */}
          <View style={styles.actionsRow}>
            <PixelButton
              title="Shop"
              onPress={() => router.push('/(tabs)/shop')}
              variant="secondary"
              style={{ flex: 1 }}
            />
            <PixelButton
              title="Achievements"
              onPress={() => router.push('/achievements')}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.actionsRow}>
            <PixelButton
              title="🔔 Notifications"
              onPress={() => router.push('/notifications')}
              variant="secondary"
              style={{ flex: 1 }}
            />
          </View>

          <View style={styles.actionsRow}>
            <PixelButton
              title="Edit Profile"
              onPress={() => router.push('/profile/edit')}
              variant="ghost"
              style={{ flex: 1 }}
            />
            <PixelButton
              title="Settings"
              onPress={() => router.push('/settings')}
              variant="ghost"
              style={{ flex: 1 }}
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
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
    marginTop: spacing.xs,
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

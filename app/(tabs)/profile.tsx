import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useAuth } from '../../src/features/auth/hooks/use-auth';
import { signOut } from '../../src/features/auth/stores/auth-store';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../../src/features/gamification/components/xp-bar';
import { PixelAvatar } from '../../src/features/avatar/renderer/pixel-avatar';
import { shopStore$, fetchShop } from '../../src/features/shop/stores/shop-store';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, xpForNextLevel, xpProgress, isLoading } = useProfileStats();
  const equippedSlots = use$(shopStore$.equippedSlots);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [idleFrame, setIdleFrame] = useState(0);

  useEffect(() => {
    fetchShop();
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
          </View>

          {/* XP Bar */}
          <View style={styles.card}>
            <XpBar
              level={level}
              currentXp={profile?.xp ?? 0}
              nextLevelXp={xpForNextLevel}
              progress={xpProgress}
            />
          </View>

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
});

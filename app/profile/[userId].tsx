import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelAvatar } from '../../src/features/avatar/renderer/pixel-avatar';
import { supabase } from '../../src/lib/supabase/client';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { getAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';
import { sendFriendRequest, friendsStore$ } from '../../src/features/social/stores/friends-store';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';

interface PublicProfile {
  id: string;
  username: string;
  xp: number;
  level: number;
  gold: number;
  created_at: string;
}

interface ProfileStats {
  totalCompletions: number;
  bestStreak: number;
  duelsWon: number;
  duelsTotal: number;
}

export default function PublicProfileScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  notFound: {
    color: colors.textMuted,
    fontSize: fontSizes.md,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  username: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  rank: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  stage: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  memberSince: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSizes.xs - 1,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  friendChip: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.success,
    letterSpacing: 1,
  },
  pendingChip: {
    textAlign: 'center',
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
}), [themeKey]);
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  const friends = use$(friendsStore$.friends);
  const pendingSent = use$(friendsStore$.pendingSent);

  const alreadyFriend = friends.some((f) => f.profile?.id === userId);
  const alreadySent = pendingSent.some((f) => f.profile?.id === userId);

  useEffect(() => {
    if (!userId) return;
    loadProfile();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, xp, level, gold, created_at')
        .eq('id', userId)
        .single();

      if (!p) return;
      setProfile(p as PublicProfile);

      // Load public stats
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', userId)
        .eq('is_archived', false);

      const habitIds = (habits ?? []).map((h) => h.id);

      const [completionRes, streakRes] = await Promise.all([
        habitIds.length > 0
          ? supabase
              .from('completions')
              .select('*', { count: 'exact', head: true })
              .in('habit_id', habitIds)
          : Promise.resolve({ count: 0 }),
        habitIds.length > 0
          ? supabase
              .from('streaks')
              .select('longest_count')
              .in('habit_id', habitIds)
          : Promise.resolve({ data: [] }),
      ]);

      const bestStreak = (streakRes.data ?? []).reduce(
        (max: number, s: { longest_count: number }) => Math.max(max, s.longest_count),
        0,
      );

      setStats({
        totalCompletions: (completionRes as any).count ?? 0,
        bestStreak,
        duelsWon: 0,
        duelsTotal: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.notFound}>Profile not found</Text>
        <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />
      </View>
    );
  }

  const rank = getRankForLevel(profile.level);
  const avatarStage = getAvatarStage(profile.level);
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />

      {/* Hero */}
      <View style={styles.hero}>
        <PixelAvatar size={160} />
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={[styles.rank, { color: rank.color }]}>{rank.name}</Text>
        <Text style={[styles.stage, { color: avatarStage.aura }]}>
          {avatarStage.title}
        </Text>
        <Text style={styles.memberSince}>Member since {memberSince}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.xp }]}>{profile.level}</Text>
          <Text style={styles.statLabel}>LEVEL</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.xp }]}>{profile.xp}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{profile.gold}</Text>
          <Text style={styles.statLabel}>GOLD</Text>
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {stats.totalCompletions}
            </Text>
            <Text style={styles.statLabel}>COMPLETIONS</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.streak }]}>
              {stats.bestStreak}🔥
            </Text>
            <Text style={styles.statLabel}>BEST STREAK</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {alreadyFriend ? (
          <>
            <Text style={styles.friendChip}>👥 Friends</Text>
            <PixelButton
              title="⚔️ Challenge"
              onPress={() =>
                router.push(
                  `/challenge/create?opponentId=${profile.id}&opponentName=${profile.username}`,
                )
              }
              variant="secondary"
            />
            <PixelButton
              title="⚔️ Quick Duel"
              onPress={() =>
                router.push(
                  `/duels/battle?opponentId=${profile.id}&opponentName=${profile.username}&opponentLevel=${profile.level}`,
                )
              }
            />
          </>
        ) : alreadySent ? (
          <Text style={styles.pendingChip}>Request sent ⏳</Text>
        ) : (
          <PixelButton
            title="+ Add Friend"
            onPress={() => sendFriendRequest(profile.id)}
          />
        )}
      </View>
    </ScrollView>
  );
}



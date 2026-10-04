import { goBack } from '../../src/lib/navigation';
import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { EvolvedAvatar } from '../../src/features/avatar/components/evolved-avatar';
import { fetchEquipmentOf, type Equipment } from '../../src/features/shop/stores/shop-store';
import { supabase } from '../../src/lib/supabase/client';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { sendFriendRequest, fetchFriends, friendsStore$ } from '../../src/features/social/stores/friends-store';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT, lang$, localeTag } from '../../src/lib/i18n';
import { titleLabel } from '../../src/lib/i18n/labels';

interface PublicProfile {
  id: string;
  username: string;
  xp: number;
  level: number;
  gold: number;
  created_at: string;
  skin_color: string;
  hair_color: string;
  eye_color: string;
}

interface ProfileStats {
  bestStreak: number;
  duelsWon: number;
  duelsTotal: number;
}

export default function PublicProfileScreen() {
  const T = useT();
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
    fontSize: pixelSize(fontSizes.xxl),
    fontFamily: fonts.bold,
    color: colors.text,
    marginTop: spacing.sm,
  },
  rank: {
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
    letterSpacing: 2,
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
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
  },
  statLabel: {
    fontSize: pixelSize(fontSizes.xs - 1),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  friendChip: {
    textAlign: 'center',
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: colors.success,
    letterSpacing: 1,
  },
  pendingChip: {
    textAlign: 'center',
    fontSize: pixelSize(fontSizes.sm),
    color: colors.textMuted,
    fontFamily: fonts.bold,
  },
}), [themeKey]);
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [gear, setGear] = useState<Equipment>({});
  const [loading, setLoading] = useState(true);

  const friends = use$(friendsStore$.friends);
  const pendingSent = use$(friendsStore$.pendingSent);

  const alreadyFriend = friends.some((f) => f.profile?.id === userId);
  const alreadySent = pendingSent.some((f) => f.profile?.id === userId);

  useEffect(() => {
    if (!userId) return;
    loadProfile();
    // Opened from a link or a notification: know whether we are already friends.
    void fetchFriends();
  }, [userId]);

  async function loadProfile() {
    setLoading(true);
    try {
      const { data: p } = await supabase
        .from('profiles')
        .select('id, username, xp, level, gold, best_streak, created_at, skin_color, hair_color, eye_color')
        .eq('id', userId)
        .single();

      if (!p) return;
      setProfile(p as PublicProfile);
      // Their hero as they dressed it (hat, outfit, accessory, background).
      setGear(await fetchEquipmentOf(userId));

      // Use denormalized best_streak from profiles (no RLS bypass needed)
      setStats({
        bestStreak: (p as any).best_streak ?? 0,
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
        <Text style={styles.notFound}>{T.profile_pub_not_found}</Text>
        <PixelButton title={T.common_back} onPress={() => goBack(router, '/(tabs)/social')} variant="ghost" />
      </View>
    );
  }

  const rank = getRankForLevel(profile.level);
  const memberSince = new Date(profile.created_at).toLocaleDateString(
    localeTag(lang$.get()),
    { month: 'long', year: 'numeric' },
  );

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title={T.common_back} onPress={() => goBack(router, '/(tabs)/social')} variant="ghost" />

      {/* Hero */}
      <View style={styles.hero}>
        <EvolvedAvatar
          level={profile.level}
          size={160}
          skinColor={profile.skin_color}
          hairColor={profile.hair_color}
          eyeColor={profile.eye_color}
          hat={gear.hat}
          outfit={gear.outfit}
          accessory={gear.accessory}
          background={gear.background}
        />
        <Text style={styles.username}>{profile.username}</Text>
        <Text style={[styles.rank, { color: rank.color }]}>{titleLabel(T, rank.name)}</Text>
        <Text style={styles.memberSince}>{T.profile_pub_member_since.replace('{date}', memberSince)}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.xp }]}>{profile.level}</Text>
          <Text style={styles.statLabel}>{T.profile_pub_stat_level}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.xp }]}>{profile.xp}</Text>
          <Text style={styles.statLabel}>{T.profile_pub_stat_xp}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: colors.accent }]}>{profile.gold}</Text>
          <Text style={styles.statLabel}>{T.profile_pub_stat_gold}</Text>
        </View>
      </View>

      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.streak }]}>
              {stats.bestStreak}🔥
            </Text>
            <Text style={styles.statLabel}>{T.profile_pub_stat_best_streak}</Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {alreadyFriend ? (
          <>
            <Text style={styles.friendChip}>{T.profile_pub_friends}</Text>
            <PixelButton
              title={T.profile_pub_challenge}
              onPress={() =>
                router.push(`/duels/challenge?opponentId=${profile.id}`)
              }
              variant="secondary"
            />
          </>
        ) : alreadySent ? (
          <Text style={styles.pendingChip}>{T.profile_pub_request_sent}</Text>
        ) : (
          <PixelButton
            title={T.profile_pub_add_friend}
            onPress={() => sendFriendRequest(profile.id)}
          />
        )}
      </View>
    </ScrollView>
  );
}



import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelFrame } from '../../src/ui/components/pixel-frame';
import {
  friendsStore$,
  fetchFriends,
  fetchFriendsToday,
  giveKudos,
  searchUsers,
  sendFriendRequest,
  respondToRequest,
  removeFriend,
} from '../../src/features/social/stores/friends-store';
import { useLeaderboard } from '../../src/features/social/hooks/use-leaderboard';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { AdBanner } from '../../src/features/monetization/components/ad-banner';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { titleLabel } from '../../src/lib/i18n/labels';
import { shareInvite } from '../../src/features/social/utils/invite';
import { UNLOCKS, isUnlocked, type UnlockFeature } from '../../src/lib/constants/game-config';
import { showDialog } from '../../src/lib/app-alert';
import { profileStore$ } from '../../src/features/gamification/stores/profile-store';

// D2: two tabs. Friends holds the search and each friend's streak; the
// leaderboard shows friends first (a global ranking discourages newcomers).
type Tab = 'friends' | 'leaderboard';

export default function SocialScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

  // Arena entry
  arenaEntry: { marginHorizontal: spacing.md, marginBottom: spacing.sm },
  arenaEntryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  arenaEntryIcon: { fontSize: 22 },
  arenaEntryText: { flex: 1, gap: 2 },
  arenaEntryTitle: {
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
    color: colors.accent,
    letterSpacing: 2,
  },
  arenaEntryBody: { fontSize: fontSizes.sm, color: colors.textSecondary },
  arenaEntryChevron: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.accent },

  // Leaderboard scope toggle
  scopeRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scopeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  scopeBtnText: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  scopeBtnTextActive: {
    color: colors.primary,
  },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
    position: 'relative',
  },
  tabActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
  tabLabel: { alignItems: 'center', gap: 1 },
  tabIcon: { fontSize: 14, lineHeight: 17 },
  tabText: { fontSize: pixelSize(9), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 0.3 },
  tabTextActive: { color: colors.primary },
  tabBadge: {
    backgroundColor: colors.danger,
    borderRadius: 0,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: { color: colors.text, fontSize: pixelSize(8), fontFamily: fonts.bold },

  // Common
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: fontSizes.md },
  inviteRow: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: spacing.xs, alignSelf: 'stretch' },
  inviteFeedback: { color: colors.success, textAlign: 'center', fontSize: fontSizes.sm },
  inviteRewardHint: { color: colors.textMuted, textAlign: 'center', fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },

  // Leaderboard
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: spacing.xs,
    marginBottom: spacing.md,
    paddingTop: spacing.sm,
    height: 140,
  },
  podiumSlot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  podiumGold: {},
  podiumSilver: {},
  podiumBronze: {},
  podiumMedal: { fontSize: 28 },
  podiumName: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 0.5, textAlign: 'center' },
  podiumXp: { fontSize: pixelSize(9), fontFamily: fonts.bold, marginBottom: 4 },
  podiumBar: { width: '100%' },
  restLabel: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  lbRowSelf: { borderColor: colors.primary },
  lbPos: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.textMuted, width: 30 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.text },
  lbRank: { fontSize: fontSizes.xs, color: colors.textSecondary },
  lbRight: { alignItems: 'flex-end' },
  lbXp: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.xp },
  lbLevel: { fontSize: fontSizes.xs, color: colors.textSecondary },

  // Friends
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 3,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  friendCardPending: { borderColor: colors.accent + '88' },
  friendCardLeft: { flex: 1, gap: 2 },
  pendingBadge: {
    fontSize: pixelSize(9),
    fontFamily: fonts.bold,
    color: colors.accent,
    letterSpacing: 1,
  },
  friendName: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.text },
  friendMeta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  friendRank: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
  friendXp: { fontSize: fontSizes.xs, color: colors.textMuted },
  friendToday: { fontSize: fontSizes.xs, color: colors.success },
  friendActions: { flexDirection: 'row', gap: spacing.xs },
  pendingActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { paddingHorizontal: spacing.sm, minWidth: 36 },

  // Challenges
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeStatus: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
  challengeType: { fontSize: pixelSize(fontSizes.xs), color: colors.textMuted, fontFamily: fonts.bold, letterSpacing: 1 },
  challengeVs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vsName: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.text, flex: 1 },
  vsText: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textMuted, paddingHorizontal: spacing.sm },
  challengeProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 0, overflow: 'hidden' },
  progressFillA: { height: '100%', backgroundColor: colors.primary, borderRadius: 0 },
  progressFillB: { height: '100%', backgroundColor: colors.accent, borderRadius: 0 },
  progressVal: { fontSize: pixelSize(9), color: colors.textMuted, fontFamily: fonts.bold, minWidth: 28 },
  challengeActions: { flexDirection: 'row', gap: spacing.sm },
  wager: { fontSize: pixelSize(fontSizes.xs), color: colors.accent, fontFamily: fonts.bold },
  playRow: { flexDirection: 'row', gap: spacing.sm, marginHorizontal: spacing.md, marginBottom: spacing.sm },
  playBtn: { flex: 1 },

  // Search
  searchContainer: { flex: 1 },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: 0,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  streakCount: {
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: colors.streak,
  },
  statusChip: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 0,
  },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const myId = use$(authStore$.user)?.id;
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<string | null>(null);

  const friends = use$(friendsStore$.friends);
  const friendsToday = use$(friendsStore$.today);
  const pendingReceived = use$(friendsStore$.pendingReceived);
  const searchResults = use$(friendsStore$.searchResults);
  const isLoading = use$(friendsStore$.isLoading);

  const [lbScope, setLbScope] = useState<'friends' | 'global'>('friends');
  const { entries: leaderboard, isLoading: lbLoading, refresh: refreshLb } = useLeaderboard(lbScope);

  useEffect(() => {
    fetchFriends();
    fetchFriendsToday();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriends(), fetchFriendsToday(), refreshLb()]);
    setRefreshing(false);
  };


  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'friends', label: T.social_tab_friends, badge: pendingReceived.length },
    { key: 'leaderboard', label: T.social_tab_rank },
  ];

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const renderLeaderboard = () => {
    const emptyText = lbScope === 'friends'
      ? T.social_lb_empty_friends
      : T.social_lb_empty_global;

    return (
      <>
        {/* Scope toggle */}
        <View style={styles.scopeRow}>
          <Pressable
            style={[styles.scopeBtn, lbScope === 'friends' && styles.scopeBtnActive]}
            onPress={() => setLbScope('friends')}
          >
            <Text style={[styles.scopeBtnText, lbScope === 'friends' && styles.scopeBtnTextActive]}>
              👥 {T.social_scope_friends}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.scopeBtn, lbScope === 'global' && styles.scopeBtnActive]}
            onPress={() => setLbScope('global')}
          >
            <Text style={[styles.scopeBtnText, lbScope === 'global' && styles.scopeBtnTextActive]}>
              🌍 {T.social_scope_global}
            </Text>
          </Pressable>
        </View>
        {lbScope === 'friends' && renderInviteButton()}
        {renderLeaderboardList(emptyText)}
      </>
    );
  };

  // ── Invite ──────────────────────────────────────────────────────────────────
  const handleInvite = async () => {
    try {
      const how = await shareInvite(T.invite_share_message);
      setInviteFeedback(how === 'copied' ? T.invite_copied : null);
    } catch {
      // Share sheet dismissed or offline: nothing to report.
    }
  };

  const renderInviteButton = () => (
    <View style={styles.inviteRow}>
      <PixelButton title={T.invite_button} onPress={handleInvite} variant="secondary" />
      <Text style={styles.inviteRewardHint}>{T.invite_reward_hint}</Text>
      {inviteFeedback && <Text style={styles.inviteFeedback}>{inviteFeedback}</Text>}
    </View>
  );

  const renderLeaderboardList = (emptyText: string) => {
    if (lbLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
    if (leaderboard.length === 0) return (
      <View style={styles.empty}>
        <Text style={styles.emptyEmoji}>🌍</Text>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );

    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    return (
      <FlatList
        data={rest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* Podium */}
            <View style={styles.podium}>
              {top3[1] && (
                <View style={[styles.podiumSlot, styles.podiumSilver]}>
                  <Text style={styles.podiumMedal}>🥈</Text>
                  <Text style={[styles.podiumName, { color: '#c0c0c0' }]} numberOfLines={1}>
                    {top3[1].username}{top3[1].isCurrentUser ? ' ★' : ''}
                  </Text>
                  <Text style={[styles.podiumXp, { color: '#c0c0c0' }]}>{top3[1].xp} XP</Text>
                  <View style={[styles.podiumBar, { height: 60, backgroundColor: '#c0c0c055' }]} />
                </View>
              )}
              {top3[0] && (
                <View style={[styles.podiumSlot, styles.podiumGold]}>
                  <Text style={styles.podiumMedal}>🥇</Text>
                  <Text style={[styles.podiumName, { color: colors.accent }]} numberOfLines={1}>
                    {top3[0].username}{top3[0].isCurrentUser ? ' ★' : ''}
                  </Text>
                  <Text style={[styles.podiumXp, { color: colors.accent }]}>{top3[0].xp} XP</Text>
                  <View style={[styles.podiumBar, { height: 80, backgroundColor: colors.accent + '44' }]} />
                </View>
              )}
              {top3[2] && (
                <View style={[styles.podiumSlot, styles.podiumBronze]}>
                  <Text style={styles.podiumMedal}>🥉</Text>
                  <Text style={[styles.podiumName, { color: '#cd7f32' }]} numberOfLines={1}>
                    {top3[2].username}{top3[2].isCurrentUser ? ' ★' : ''}
                  </Text>
                  <Text style={[styles.podiumXp, { color: '#cd7f32' }]}>{top3[2].xp} XP</Text>
                  <View style={[styles.podiumBar, { height: 44, backgroundColor: '#cd7f3244' }]} />
                </View>
              )}
            </View>
            {rest.length > 0 && <Text style={styles.restLabel}>{T.social_other_rankings}</Text>}
          </View>
        }
        renderItem={({ item, index }) => {
          const pos = index + 4;
          return (
            <View style={[styles.lbRow, item.isCurrentUser && styles.lbRowSelf]}>
              <Text style={styles.lbPos}>#{pos}</Text>
              <View style={styles.lbInfo}>
                <Text style={styles.lbName}>
                  {item.username}{item.isCurrentUser ? ' ★' : ''}
                </Text>
                <Text style={styles.lbRank}>{titleLabel(T, item.rank)}</Text>
              </View>
              <View style={styles.lbRight}>
                <Text style={styles.lbXp}>{item.xp} XP</Text>
                <Text style={styles.lbLevel}>{T.social_lv_prefix}{item.level}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  // ── Friends ─────────────────────────────────────────────────────────────────
  const searchBox = (
    <TextInput
      style={styles.searchInput}
      placeholder={T.social_search_placeholder}
      placeholderTextColor={colors.textMuted}
      value={searchQuery}
      onChangeText={(text) => { setSearchQuery(text); searchUsers(text); }}
      autoCapitalize="none"
      autoCorrect={false}
      testID="social-search"
    />
  );

  const renderFriends = () => {
    if (searchQuery.trim().length >= 2) return renderSearch();
    const allItems = [
      ...pendingReceived.map((f) => ({ ...f, type: 'pending' as const })),
      ...friends.map((f) => ({ ...f, type: 'friend' as const })),
    ];

    if (isLoading && allItems.length === 0) return (
      <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
    );

    return (
      <FlatList
        data={allItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={allItems.length > 0 ? renderInviteButton() : null}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>{T.social_friends_empty}</Text>
            {renderInviteButton()}
          </View>
        }
        renderItem={({ item }) => {
          const profile = item.profile;
          const rank = profile ? getRankForLevel(profile.level ?? 1) : null;

          if (item.type === 'pending') {
            return (
              <View style={[styles.friendCard, styles.friendCardPending]}>
                <View style={styles.friendCardLeft}>
                  <Text style={styles.pendingBadge}>{T.social_request_badge}</Text>
                  <Text style={styles.friendName}>{profile?.username ?? '—'}</Text>
                  {rank && <Text style={[styles.friendRank, { color: rank.color }]}>{titleLabel(T, rank.name)}</Text>}
                </View>
                <View style={styles.pendingActions}>
                  <PixelButton title="✓" onPress={() => respondToRequest(item.id, true)} style={styles.actionBtn} />
                  <PixelButton title="✕" onPress={() => respondToRequest(item.id, false)} variant="ghost" style={styles.actionBtn} />
                </View>
              </View>
            );
          }

          const day = profile?.id ? friendsToday[profile.id] : undefined;
          return (
            <Pressable
              style={styles.friendCard}
              onPress={() => profile?.id && router.push(`/profile/${profile.id}`)}
            >
              <View style={styles.friendCardLeft}>
                <Text style={styles.friendName}>{profile?.username ?? '—'}</Text>
                <View style={styles.friendMeta}>
                  {rank && <Text style={[styles.friendRank, { color: rank.color }]}>{titleLabel(T, rank.name)}</Text>}
                  <Text style={styles.friendXp}>{T.social_lv_prefix}{profile?.level ?? 1} · 🔥 {profile?.best_streak ?? 0}</Text>
                </View>
                {day && day.done > 0 ? (
                  <Text style={styles.friendToday}>{T.social_done_today.replace('{n}', String(day.done))}</Text>
                ) : null}
                {day && day.received > 0 ? (
                  <Text style={styles.friendToday}>{T.social_kudos_received}</Text>
                ) : null}
              </View>
              <View style={styles.friendActions}>
                {/* Cheer a friend who did a quest today (G4). */}
                {day && day.done > 0 ? (
                  <PixelButton
                    title={day.sent ? '👏✓' : '👏'}
                    onPress={() => profile?.id && giveKudos(profile.id)}
                    disabled={day.sent}
                    testID={`friend-kudos-${profile?.id}`}
                    variant="secondary"
                    style={styles.actionBtn}
                  />
                ) : null}
                {/* A duel with this friend (opens at level 5, I6). */}
                <PixelButton
                  title="⚔️"
                  onPress={() => (duelsOpen ? router.push(`/duels/challenge?opponentId=${profile?.id}`) : explainLocked('duels'))}
                  testID={`friend-duel-${profile?.id}`}
                  variant="secondary"
                  style={styles.actionBtn}
                />
                <PixelButton
                  title="✕"
                  onPress={() => Alert.alert(
                    T.social_remove_friend_title,
                    T.social_remove_friend_msg.replace('{name}', profile?.username ?? ''),
                    [
                      { text: T.social_cancel, style: 'cancel' },
                      { text: T.social_remove, style: 'destructive', onPress: () => removeFriend(item.id) },
                    ],
                  )}
                  variant="ghost"
                  style={styles.actionBtn}
                />
              </View>
            </Pressable>
          );
        }}
      />
    );
  };

  // Progressive unlocks (I6): the server enforces the same levels.
  const myLevel = use$(profileStore$.profile)?.level ?? 1;
  const arenaOpen = isUnlocked('arena', myLevel);
  const duelsOpen = isUnlocked('duels', myLevel);
  const coopOpen = isUnlocked('coop', myLevel);
  const explainLocked = (feature: UnlockFeature) =>
    showDialog(T.unlock_locked_title, T.unlock_locked_body.replace('{n}', String(UNLOCKS[feature])));

  // ── Search ───────────────────────────────────────────────────────────────────
  const renderSearch = () => (
    <View style={styles.searchContainer}>
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{searchQuery.length >= 2 ? '🙈' : '🔍'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery.length >= 2 ? T.social_search_empty_none : T.social_search_empty_short}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const alreadyFriend = friends.some((f) => f.profile?.id === item.id);
          const alreadySent = friendsStore$.pendingSent.get().some((f) => f.profile?.id === item.id);
          const rank = getRankForLevel(item.level ?? 1);

          return (
            <View style={styles.friendCard}>
              <View style={styles.friendCardLeft}>
                <Text style={styles.friendName}>{item.username}</Text>
                <View style={styles.friendMeta}>
                  <Text style={[styles.friendRank, { color: rank.color }]}>{titleLabel(T, rank.name)}</Text>
                  <Text style={styles.friendXp}>{item.xp ?? 0} XP · {T.social_lv_prefix}{item.level ?? 1}</Text>
                </View>
              </View>
              {alreadyFriend ? (
                <Text style={styles.statusChip}>{T.social_already_friend} ✓</Text>
              ) : alreadySent ? (
                <Text style={styles.statusChip}>{T.social_request_sent} ⏳</Text>
              ) : (
                <PixelButton title={`+ ${T.social_send_request}`} onPress={() => sendFriendRequest(item.id)} style={styles.actionBtn} />
              )}
            </View>
          );
        }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Text style={styles.title}>{T.social_title}</Text>

      {/* Arena (ADR 012): open to everyone, even without friends. */}
      <Pressable
        onPress={() => router.push('/arena')}
        accessibilityRole="button"
        testID="social-arena-entry"
        style={styles.arenaEntry}
      >
        {({ pressed }) => (
          <PixelFrame
            pressed={pressed}
            borderColor={colors.accent}
            backgroundColor={colors.surface}
            contentStyle={styles.arenaEntryContent}
          >
            <Text style={styles.arenaEntryIcon}>⚔️</Text>
            <View style={styles.arenaEntryText}>
              <Text style={styles.arenaEntryTitle}>{arenaOpen ? T.arena_title : `🔒 ${T.arena_title}`}</Text>
              <Text style={styles.arenaEntryBody}>
                {arenaOpen ? T.arena_entry_body : T.unlock_at_level.replace('{n}', String(UNLOCKS.arena))}
              </Text>
            </View>
            <Text style={styles.arenaEntryChevron}>›</Text>
          </PixelFrame>
        )}
      </Pressable>

      <View style={styles.playRow}>
        <PixelButton
          title={duelsOpen ? T.social_duels_short : `🔒 ${T.social_duels_short}`}
          onPress={() => (duelsOpen ? router.push('/duels') : explainLocked('duels'))}
          variant="secondary"
          style={styles.playBtn}
        />
        <PixelButton
          title={coopOpen ? T.social_coop_short : `🔒 ${T.social_coop_short}`}
          onPress={() => (coopOpen ? router.push('/coop') : explainLocked('coop'))}
          variant="secondary"
          style={styles.playBtn}
        />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            {/* Emoji above the word. */}
            <View style={styles.tabLabel}>
              <Text style={styles.tabIcon}>{tab.label.split(' ')[0]}</Text>
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
                numberOfLines={1}
              >
                {tab.label.split(' ').slice(1).join(' ')}
              </Text>
            </View>
            {!!tab.badge && tab.badge > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {activeTab === 'friends' && searchBox}
      {activeTab === 'friends' && renderFriends()}
      {activeTab === 'leaderboard' && renderLeaderboard()}
      <AdBanner position="bottom" />
    </View>
  );
}



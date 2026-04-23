import { useState, useEffect } from 'react';
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
import {
  friendsStore$,
  fetchFriends,
  searchUsers,
  sendFriendRequest,
  respondToRequest,
  removeFriend,
} from '../../src/features/social/stores/friends-store';
import {
  challengesStore$,
  fetchChallenges,
  respondToChallenge,
} from '../../src/features/social/stores/challenges-store';
import { useLeaderboard, useStreakLeaderboard } from '../../src/features/social/hooks/use-leaderboard';
import type { StreakLeaderEntry } from '../../src/features/social/hooks/use-leaderboard';
import { getRankForLevel } from '../../src/lib/constants/game-config';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { AdBanner } from '../../src/features/monetization/components/ad-banner';

type Tab = 'leaderboard' | 'friends' | 'challenges' | 'search' | 'streaks';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = [colors.accent, '#c0c0c0', '#cd7f32'];

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const friends = use$(friendsStore$.friends);
  const pendingReceived = use$(friendsStore$.pendingReceived);
  const searchResults = use$(friendsStore$.searchResults);
  const isLoading = use$(friendsStore$.isLoading);
  const activeChallenges = use$(challengesStore$.active);
  const pendingChallenges = use$(challengesStore$.pending);
  const completedChallenges = use$(challengesStore$.completed);

  const [lbScope, setLbScope] = useState<'friends' | 'global'>('friends');
  const { entries: leaderboard, isLoading: lbLoading, refresh: refreshLb } = useLeaderboard(lbScope);
  const { entries: streakLeaderboard, isLoading: streakLbLoading, refresh: refreshStreakLb } = useStreakLeaderboard();

  useEffect(() => {
    fetchFriends();
    fetchChallenges();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriends(), fetchChallenges(), refreshLb(), refreshStreakLb()]);
    setRefreshing(false);
  };

  const pendingCount = pendingReceived.length + pendingChallenges.length;
  const challengeCount = activeChallenges.length + pendingChallenges.length;

  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'leaderboard', label: '🏆 RANK' },
    { key: 'friends', label: '👥 FRIENDS', badge: pendingReceived.length },
    { key: 'challenges', label: '⚔️ DUELS', badge: pendingChallenges.length },
    { key: 'streaks', label: '🔥 STREAKS' },
    { key: 'search', label: '🔍 SEARCH' },
  ];

  // ── Leaderboard ────────────────────────────────────────────────────────────
  const renderLeaderboard = () => {
    const emptyText = lbScope === 'friends'
      ? 'Add friends to see the leaderboard!'
      : 'No players yet — be the first!';

    return (
      <>
        {/* Scope toggle */}
        <View style={styles.scopeRow}>
          <Pressable
            style={[styles.scopeBtn, lbScope === 'friends' && styles.scopeBtnActive]}
            onPress={() => setLbScope('friends')}
          >
            <Text style={[styles.scopeBtnText, lbScope === 'friends' && styles.scopeBtnTextActive]}>
              👥 FRIENDS
            </Text>
          </Pressable>
          <Pressable
            style={[styles.scopeBtn, lbScope === 'global' && styles.scopeBtnActive]}
            onPress={() => setLbScope('global')}
          >
            <Text style={[styles.scopeBtnText, lbScope === 'global' && styles.scopeBtnTextActive]}>
              🌍 GLOBAL
            </Text>
          </Pressable>
        </View>
        {renderLeaderboardList(emptyText)}
      </>
    );
  };

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
            {rest.length > 0 && <Text style={styles.restLabel}>OTHER RANKINGS</Text>}
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
                <Text style={styles.lbRank}>{item.rank}</Text>
              </View>
              <View style={styles.lbRight}>
                <Text style={styles.lbXp}>{item.xp} XP</Text>
                <Text style={styles.lbLevel}>Lv.{item.level}</Text>
              </View>
            </View>
          );
        }}
      />
    );
  };

  // ── Friends ─────────────────────────────────────────────────────────────────
  const renderFriends = () => {
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>👥</Text>
            <Text style={styles.emptyText}>No friends yet.{'\n'}Use SEARCH to find people!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const profile = item.profile;
          const rank = profile ? getRankForLevel(profile.level ?? 0) : null;

          if (item.type === 'pending') {
            return (
              <View style={[styles.friendCard, styles.friendCardPending]}>
                <View style={styles.friendCardLeft}>
                  <Text style={styles.pendingBadge}>REQUEST</Text>
                  <Text style={styles.friendName}>{profile?.username ?? '—'}</Text>
                  {rank && <Text style={[styles.friendRank, { color: rank.color }]}>{rank.name}</Text>}
                </View>
                <View style={styles.pendingActions}>
                  <PixelButton title="✓" onPress={() => respondToRequest(item.id, true)} style={styles.actionBtn} />
                  <PixelButton title="✕" onPress={() => respondToRequest(item.id, false)} variant="ghost" style={styles.actionBtn} />
                </View>
              </View>
            );
          }

          return (
            <Pressable
              style={styles.friendCard}
              onPress={() => profile?.id && router.push(`/profile/${profile.id}`)}
            >
              <View style={styles.friendCardLeft}>
                <Text style={styles.friendName}>{profile?.username ?? '—'}</Text>
                <View style={styles.friendMeta}>
                  {rank && <Text style={[styles.friendRank, { color: rank.color }]}>{rank.name}</Text>}
                  <Text style={styles.friendXp}>{profile?.xp ?? 0} XP · Lv.{profile?.level ?? 0}</Text>
                </View>
              </View>
              <View style={styles.friendActions}>
                <PixelButton
                  title="⚔️"
                  onPress={() => router.push(`/challenge/create?opponentId=${profile?.id}&opponentName=${profile?.username}`)}
                  variant="secondary"
                  style={styles.actionBtn}
                />
                <PixelButton
                  title="✕"
                  onPress={() => Alert.alert('Remove friend', `Remove ${profile?.username}?`, [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Remove', style: 'destructive', onPress: () => removeFriend(item.id) },
                  ])}
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

  // ── Challenges ───────────────────────────────────────────────────────────────
  const renderChallenges = () => {
    const allChallenges = [
      ...pendingChallenges.map((c) => ({ ...c, section: 'pending' })),
      ...activeChallenges.map((c) => ({ ...c, section: 'active' })),
      ...completedChallenges.slice(0, 5).map((c) => ({ ...c, section: 'completed' })),
    ];

    return (
      <>
      <PixelButton
        title="⚔️ DUEL ARENA — Turn-Based Combat"
        onPress={() => router.push('/duels')}
        style={styles.duelArenaBtn}
      />
      <FlatList
        data={allChallenges}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>⚔️</Text>
            <Text style={styles.emptyText}>No duels yet.{'\n'}Challenge a friend!</Text>
          </View>
        }
        renderItem={({ item }) => {
          const userId = friendsStore$.friends.get()[0]; // just for type safety
          const isCreator = (item as any).section !== undefined;
          const opponent = (item as any).opponent_profile;
          const creator = (item as any).creator_profile;
          const section = (item as any).section as string;
          const challenge = item as any;

          const sectionColor = section === 'pending' ? colors.accent
            : section === 'active' ? colors.success
            : colors.textMuted;

          return (
            <View style={[styles.challengeCard, { borderColor: sectionColor + '88' }]}>
              <View style={styles.challengeHeader}>
                <Text style={[styles.challengeStatus, { color: sectionColor }]}>
                  {section.toUpperCase()}
                </Text>
                <Text style={styles.challengeType}>{challenge.type?.toUpperCase()}</Text>
              </View>
              <View style={styles.challengeVs}>
                <Text style={styles.vsName}>{creator?.username ?? '—'}</Text>
                <Text style={styles.vsText}>VS</Text>
                <Text style={styles.vsName}>{opponent?.username ?? '—'}</Text>
              </View>
              <View style={styles.challengeProgress}>
                <Text style={styles.progressVal}>{challenge.creator_progress}/{challenge.target}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFillA, { width: `${Math.min((challenge.creator_progress / (challenge.target || 1)) * 100, 100)}%` }]} />
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFillB, { width: `${Math.min((challenge.opponent_progress / (challenge.target || 1)) * 100, 100)}%` }]} />
                </View>
                <Text style={styles.progressVal}>{challenge.opponent_progress}/{challenge.target}</Text>
              </View>
              {section === 'pending' && (
                <View style={styles.challengeActions}>
                  <PixelButton title="Accept" onPress={() => respondToChallenge(challenge.id, true)} style={{ flex: 1 }} />
                  <PixelButton title="Decline" onPress={() => respondToChallenge(challenge.id, false)} variant="ghost" style={{ flex: 1 }} />
                </View>
              )}
              {challenge.gold_wager > 0 && (
                <Text style={styles.wager}>💰 {challenge.gold_wager}g wager</Text>
              )}
            </View>
          );
        }}
      />
      </>
    );
  };

  // ── Streak Leaderboard ───────────────────────────────────────────────────────
  const renderStreakLeaderboard = () => {
    if (streakLbLoading) {
      return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />;
    }
    if (streakLeaderboard.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🔥</Text>
          <Text style={styles.emptyText}>Add friends to compare streaks!</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={streakLeaderboard}
        keyExtractor={(item: StreakLeaderEntry) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        renderItem={({ item, index }: { item: StreakLeaderEntry; index: number }) => {
          const rank = index + 1;
          const medal = rank <= 3 ? MEDAL[rank - 1] : null;
          const medalColor = rank <= 3 ? MEDAL_COLORS[rank - 1] : colors.textMuted;

          return (
            <View style={[styles.lbRow, item.isCurrentUser && styles.lbRowSelf]}>
              <Text style={[styles.lbPos, { color: medalColor }]}>
                {medal ?? `#${rank}`}
              </Text>
              <View style={styles.lbInfo}>
                <Text style={styles.lbName}>
                  {item.username}{item.isCurrentUser ? ' YOU ★' : ''}
                </Text>
                <Text style={styles.lbLevel}>Lv.{item.level}</Text>
              </View>
              <Text style={styles.streakCount}>🔥 {item.bestStreak} days</Text>
            </View>
          );
        }}
      />
    );
  };

  // ── Search ───────────────────────────────────────────────────────────────────
  const renderSearch = () => (
    <View style={styles.searchContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by username..."
        placeholderTextColor={colors.textMuted}
        value={searchQuery}
        onChangeText={(text) => { setSearchQuery(text); searchUsers(text); }}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>{searchQuery.length >= 2 ? '🙈' : '🔍'}</Text>
            <Text style={styles.emptyText}>
              {searchQuery.length >= 2 ? 'No users found' : 'Type at least 2 characters'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const alreadyFriend = friends.some((f) => f.profile?.id === item.id);
          const alreadySent = friendsStore$.pendingSent.get().some((f) => f.profile?.id === item.id);
          const rank = getRankForLevel(item.level ?? 0);

          return (
            <View style={styles.friendCard}>
              <View style={styles.friendCardLeft}>
                <Text style={styles.friendName}>{item.username}</Text>
                <View style={styles.friendMeta}>
                  <Text style={[styles.friendRank, { color: rank.color }]}>{rank.name}</Text>
                  <Text style={styles.friendXp}>{item.xp ?? 0} XP · Lv.{item.level ?? 0}</Text>
                </View>
              </View>
              {alreadyFriend ? (
                <Text style={styles.statusChip}>Friends ✓</Text>
              ) : alreadySent ? (
                <Text style={styles.statusChip}>Sent ⏳</Text>
              ) : (
                <PixelButton title="+ Add" onPress={() => sendFriendRequest(item.id)} style={styles.actionBtn} />
              )}
            </View>
          );
        }}
      />
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <Text style={styles.title}>SOCIAL</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {!!tab.badge && tab.badge > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{tab.badge}</Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {activeTab === 'leaderboard' && renderLeaderboard()}
      {activeTab === 'friends' && renderFriends()}
      {activeTab === 'challenges' && renderChallenges()}
      {activeTab === 'streaks' && renderStreakLeaderboard()}
      {activeTab === 'search' && renderSearch()}
      <AdBanner position="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },

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
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  scopeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  scopeBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
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
  tabText: { fontSize: 9, fontWeight: 'bold', color: colors.textMuted, letterSpacing: 0.5 },
  tabTextActive: { color: colors.primary },
  tabBadge: {
    backgroundColor: colors.danger,
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  tabBadgeText: { color: colors.text, fontSize: 8, fontWeight: 'bold' },

  // Common
  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  empty: { alignItems: 'center', paddingTop: spacing.xxl, gap: spacing.sm },
  emptyEmoji: { fontSize: 48 },
  emptyText: { color: colors.textMuted, textAlign: 'center', fontSize: fontSizes.md },

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
  podiumName: { fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 0.5, textAlign: 'center' },
  podiumXp: { fontSize: 9, fontWeight: 'bold', marginBottom: 4 },
  podiumBar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  restLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  lbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  lbRowSelf: { borderColor: colors.primary },
  lbPos: { fontSize: fontSizes.md, fontWeight: 'bold', color: colors.textMuted, width: 30 },
  lbInfo: { flex: 1 },
  lbName: { fontSize: fontSizes.sm, fontWeight: 'bold', color: colors.text },
  lbRank: { fontSize: fontSizes.xs, color: colors.textSecondary },
  lbRight: { alignItems: 'flex-end' },
  lbXp: { fontSize: fontSizes.sm, fontWeight: 'bold', color: colors.xp },
  lbLevel: { fontSize: fontSizes.xs, color: colors.textSecondary },

  // Friends
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    borderBottomWidth: 3,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  friendCardPending: { borderColor: colors.accent + '88' },
  friendCardLeft: { flex: 1, gap: 2 },
  pendingBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 1,
  },
  friendName: { fontSize: fontSizes.md, fontWeight: 'bold', color: colors.text },
  friendMeta: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  friendRank: { fontSize: fontSizes.xs, fontWeight: 'bold' },
  friendXp: { fontSize: fontSizes.xs, color: colors.textMuted },
  friendActions: { flexDirection: 'row', gap: spacing.xs },
  pendingActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: { paddingHorizontal: spacing.sm, minWidth: 36 },

  // Challenges
  challengeCard: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderBottomWidth: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  challengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  challengeStatus: { fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1 },
  challengeType: { fontSize: fontSizes.xs, color: colors.textMuted, fontWeight: 'bold', letterSpacing: 1 },
  challengeVs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vsName: { fontSize: fontSizes.md, fontWeight: 'bold', color: colors.text, flex: 1 },
  vsText: { fontSize: fontSizes.sm, fontWeight: 'bold', color: colors.textMuted, paddingHorizontal: spacing.sm },
  challengeProgress: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  progressTrack: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' },
  progressFillA: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressFillB: { height: '100%', backgroundColor: colors.accent, borderRadius: 3 },
  progressVal: { fontSize: 9, color: colors.textMuted, fontWeight: 'bold', minWidth: 28 },
  challengeActions: { flexDirection: 'row', gap: spacing.sm },
  wager: { fontSize: fontSizes.xs, color: colors.accent, fontWeight: 'bold' },
  duelArenaBtn: { marginHorizontal: spacing.md, marginTop: spacing.sm },

  // Search
  searchContainer: { flex: 1 },
  searchInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    margin: spacing.md,
    marginBottom: 0,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  streakCount: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.streak,
  },
  statusChip: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 3,
  },
});

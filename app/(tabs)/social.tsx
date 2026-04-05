import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
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
} from '../../src/features/social/stores/friends-store';
import { useLeaderboard } from '../../src/features/social/hooks/use-leaderboard';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

type Tab = 'leaderboard' | 'friends' | 'search';

export default function SocialScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');
  const [searchQuery, setSearchQuery] = useState('');
  const friends = use$(friendsStore$.friends);
  const pendingReceived = use$(friendsStore$.pendingReceived);
  const searchResults = use$(friendsStore$.searchResults);
  const isLoading = use$(friendsStore$.isLoading);
  const { entries: leaderboard, isLoading: lbLoading } = useLeaderboard();

  useEffect(() => {
    fetchFriends();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>SOCIAL</Text>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {(['leaderboard', 'friends', 'search'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Leaderboard */}
      {activeTab === 'leaderboard' && (
        <FlatList
          data={leaderboard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            lbLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <Text style={styles.emptyText}>
                Add friends to see the leaderboard!
              </Text>
            )
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.leaderboardRow,
                item.isCurrentUser && styles.leaderboardRowSelf,
              ]}
            >
              <Text style={styles.lbPosition}>#{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.lbName}>
                  {item.username}
                  {item.isCurrentUser ? ' (you)' : ''}
                </Text>
                <Text style={styles.lbRank}>{item.rank}</Text>
              </View>
              <View style={styles.lbStats}>
                <Text style={styles.lbXp}>{item.xp} XP</Text>
                <Text style={styles.lbLevel}>Lv.{item.level}</Text>
              </View>
            </View>
          )}
        />
      )}

      {/* Friends */}
      {activeTab === 'friends' && (
        <FlatList
          data={[
            ...pendingReceived.map((f) => ({ ...f, isPending: true })),
            ...friends.map((f) => ({ ...f, isPending: false })),
          ]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
            ) : (
              <Text style={styles.emptyText}>
                No friends yet. Search for users to add!
              </Text>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.friendRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.friendName}>
                  {item.profile?.username ?? '—'}
                </Text>
                <Text style={styles.friendLevel}>
                  Lv.{item.profile?.level ?? 0}
                </Text>
              </View>
              {item.isPending ? (
                <View style={styles.pendingActions}>
                  <PixelButton
                    title="Accept"
                    onPress={() => respondToRequest(item.id, true)}
                    style={{ paddingHorizontal: spacing.sm }}
                  />
                  <PixelButton
                    title="Deny"
                    onPress={() => respondToRequest(item.id, false)}
                    variant="ghost"
                    style={{ paddingHorizontal: spacing.sm }}
                  />
                </View>
              ) : (
                <PixelButton
                  title="Challenge"
                  onPress={() =>
                    router.push(`/challenge/create?opponentId=${item.profile?.id}`)
                  }
                  variant="secondary"
                  style={{ paddingHorizontal: spacing.sm }}
                />
              )}
            </View>
          )}
        />
      )}

      {/* Search */}
      {activeTab === 'search' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              searchUsers(text);
            }}
            autoCapitalize="none"
          />
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              searchQuery.length >= 2 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : (
                <Text style={styles.emptyText}>
                  Type at least 2 characters to search
                </Text>
              )
            }
            renderItem={({ item }) => {
              const alreadyFriend = friends.some(
                (f) => f.profile?.id === item.id,
              );
              const alreadySent = friendsStore$.pendingSent
                .get()
                .some((f) => f.profile?.id === item.id);

              return (
                <View style={styles.friendRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.friendName}>{item.username}</Text>
                    <Text style={styles.friendLevel}>Lv.{item.level}</Text>
                  </View>
                  {alreadyFriend ? (
                    <Text style={styles.statusText}>Friends</Text>
                  ) : alreadySent ? (
                    <Text style={styles.statusText}>Pending</Text>
                  ) : (
                    <PixelButton
                      title="Add"
                      onPress={() => sendFriendRequest(item.id)}
                      style={{ paddingHorizontal: spacing.sm }}
                    />
                  )}
                </View>
              );
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  tabTextActive: {
    color: colors.primary,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSizes.md,
  },
  // Leaderboard
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  leaderboardRowSelf: {
    borderColor: colors.primary,
  },
  lbPosition: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.accent,
    width: 36,
  },
  lbName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  lbRank: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  lbStats: {
    alignItems: 'flex-end',
  },
  lbXp: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.xp,
  },
  lbLevel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  // Friends
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  friendName: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.text,
  },
  friendLevel: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  statusText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    fontWeight: 'bold',
  },
  // Search
  searchContainer: {
    flex: 1,
  },
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
});

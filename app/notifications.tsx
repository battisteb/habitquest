import { useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';
import {
  notificationsStore$,
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  type InboxNotification,
} from '../src/features/notifications/stores/notifications-store';

const TYPE_ICONS: Record<string, string> = {
  friend_request: '👥',
  friend_accepted: '🤝',
  challenge_started: '⚔️',
  challenge_completed: '🏆',
  duel_resolved: '⚡',
  achievement: '🎖️',
  streak_milestone: '🔥',
};

function getIcon(type: string): string {
  return TYPE_ICONS[type] ?? '🔔';
}

function getRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'à l\'instant';
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function NotificationItem({ item }: { item: InboxNotification }) {
  const styles = createStyles();
  const router = useRouter();

  const handlePress = useCallback(async () => {
    if (!item.isRead) {
      await markAsRead(item.id);
    }
    const route = item.data.route as string | undefined;
    if (route) {
      router.push(route as Parameters<typeof router.push>[0]);
    }
  }, [item, router]);

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.item, !item.isRead && styles.itemUnread]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getIcon(item.type)}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, !item.isRead && styles.itemTitleUnread]}>
          {item.title}
        </Text>
        <Text style={styles.itemBody} numberOfLines={2}>
          {item.body}
        </Text>
        <Text style={styles.itemTime}>{getRelativeTime(item.createdAt)}</Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </Pressable>
  );
}

function EmptyState() {
  const styles = createStyles();
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyText}>
        {'Aucune notification\nRevenez apres vos prochains duels et defis !'}
      </Text>
    </View>
  );
}

export default function NotificationsScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = use$(notificationsStore$.items);
  const unreadCount = use$(notificationsStore$.unreadCount);
  const isLoading = use$(notificationsStore$.isLoading);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<InboxNotification>) => (
      <NotificationItem item={item} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: InboxNotification) => item.id, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← RETOUR</Text>
        </Pressable>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        {unreadCount > 0 ? (
          <Pressable onPress={markAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>TOUT LIRE</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={EmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  backButton: {
    flex: 1,
    alignItems: 'flex-start',
  },
  backButtonText: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
    letterSpacing: 1,
    fontWeight: 'bold',
    paddingRight: spacing.sm,
  },
  headerTitle: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  markAllButton: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 4,
  },
  markAllText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
  loader: {
    marginTop: spacing.xl,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
    flexGrow: 1,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  itemUnread: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.primary,
  },
  iconContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    fontSize: 18,
  },
  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 0.5,
  },
  itemTitleUnread: {
    color: colors.text,
  },
  itemBody: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    lineHeight: 16,
  },
  itemTime: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.5,
  },
});
}

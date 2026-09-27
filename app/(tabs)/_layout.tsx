import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { habitsStore$ } from '../../src/features/habits/stores/habits-store';
import { isHabitCompletedEnough } from '../../src/features/habits/stores/habits-store';
import { friendsStore$ } from '../../src/features/social/stores/friends-store';
import { notificationsStore$, fetchNotifications } from '../../src/features/notifications/stores/notifications-store';
import { colors } from '../../src/ui/theme/tokens';
import { useT } from '../../src/lib/i18n';

function usePendingHabitCount(): number {
  const habits = use$(habitsStore$.habits);
  const todayCompletions = use$(habitsStore$.todayCompletions);
  const weekCompletions = use$(habitsStore$.weekCompletions);

  const active = habits.filter((h) => !(h as any).is_paused && !h.is_archived);
  const pending = active.filter((h) => !isHabitCompletedEnough(h.id));
  return pending.length;
}

function usePendingFriendCount(): number {
  const pending = use$(friendsStore$.pendingReceived);
  return pending.length;
}

function useUnreadNotificationCount(): number {
  return use$(notificationsStore$.unreadCount);
}

/**
 * Emoji icon and label drawn together: the default label layout squeezed the
 * label under emoji icons (clipped text), so the navigator label is hidden.
 */
function tabIcon(emoji: string, label: string) {
  function TabIcon({ focused, color }: { focused: boolean; color: string }) {
    return (
      <View style={{ alignItems: 'center', minWidth: 72 }}>
        <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
        <Text
          numberOfLines={1}
          style={{ color, fontSize: 10, lineHeight: 13, fontWeight: 'bold', letterSpacing: 0.5 }}
        >
          {label}
        </Text>
      </View>
    );
  }
  return TabIcon;
}

export default function TabsLayout() {
  const pendingHabits = usePendingHabitCount();
  const pendingFriends = usePendingFriendCount();
  const unreadNotifications = useUnreadNotificationCount();
  const T = useT();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 2,
          // Room for the emoji icon + label, above the home indicator.
          height: 58 + insets.bottom,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 6),
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
          tabBarIcon: tabIcon('⚔️', T.tab_quests),
          title: T.tab_quests,
          tabBarLabel: T.tab_quests,
          tabBarBadge: pendingHabits > 0 ? pendingHabits : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.streak,
            fontSize: 9,
            fontWeight: 'bold',
          },
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          tabBarIcon: tabIcon('👥', T.tab_social),
          title: T.tab_social,
          tabBarLabel: T.tab_social,
          tabBarBadge: pendingFriends > 0 ? pendingFriends : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 9,
            fontWeight: 'bold',
          },
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          tabBarIcon: tabIcon('🛒', T.tab_shop),
          title: T.tab_shop,
          tabBarLabel: T.tab_shop,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: tabIcon('🧙', T.tab_me),
          title: T.tab_me,
          tabBarLabel: T.tab_me,
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.primary,
            fontSize: 9,
            fontWeight: 'bold',
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          href: null,
          title: 'STATS',
          tabBarLabel: 'STATS',
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          href: null,
          title: 'TRAIN',
          tabBarLabel: 'TRAIN',
        }}
      />
    </Tabs>
  );
}

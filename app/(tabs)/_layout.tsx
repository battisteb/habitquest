import { useEffect } from 'react';
import { Tabs } from 'expo-router';
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

export default function TabsLayout() {
  const pendingHabits = usePendingHabitCount();
  const pendingFriends = usePendingFriendCount();
  const unreadNotifications = useUnreadNotificationCount();
  const T = useT();

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
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontWeight: 'bold',
          fontSize: 10,
          letterSpacing: 0.5,
        },
      }}
    >
      <Tabs.Screen
        name="today"
        options={{
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
          title: T.tab_shop,
          tabBarLabel: T.tab_shop,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
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

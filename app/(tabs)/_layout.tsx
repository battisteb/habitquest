import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { habitsStore$, isHabitCompletedEnough } from '../../src/features/habits/stores/habits-store';
import { friendsStore$ } from '../../src/features/social/stores/friends-store';
import { notificationsStore$, fetchNotifications } from '../../src/features/notifications/stores/notifications-store';
import { colors, fonts, PIXEL, pixelSize } from '../../src/ui/theme/tokens';
import { shade } from '../../src/ui/components/pixel-frame';
import { useT } from '../../src/lib/i18n';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useOwnedThemes } from '../../src/features/shop/hooks/use-owned-themes';
import { shopStore$, fetchShop } from '../../src/features/shop/stores/shop-store';
import { FREE_THEME } from '../../src/features/shop/utils/owned-themes';
import { playSfx } from '../../src/lib/audio/sound-service';

function usePendingHabitCount(): number {
  const habits = use$(habitsStore$.habits);
  // Subscribed so the badge updates when a quest is completed.
  use$(habitsStore$.todayCompletions);
  use$(habitsStore$.weekCompletions);

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
      <View
        style={{
          alignItems: 'center',
          minWidth: 72,
          paddingHorizontal: 4,
          paddingBottom: 2,
          // Active tab: a solid pixel block, like a selected menu entry.
          backgroundColor: focused ? colors.primary : 'transparent',
        }}
      >
        <Text style={{ fontSize: 18, lineHeight: 22, opacity: focused ? 1 : 0.55 }}>{emoji}</Text>
        <Text
          numberOfLines={1}
          style={{ color: focused ? colors.text : color, fontSize: pixelSize(11), lineHeight: pixelSize(13), fontFamily: fonts.bold, letterSpacing: 0.5 }}
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
  // Themes are sold in the shop (Q15): a theme that is not owned falls back to the free one.
  const { themeKey, setTheme } = useTheme();
  const ownedThemes = useOwnedThemes();
  const shopLoaded = use$(shopStore$.items).length > 0;
  useEffect(() => {
    void fetchShop();
  }, []);
  useEffect(() => {
    if (shopLoaded && !ownedThemes.has(themeKey)) setTheme(FREE_THEME);
  }, [shopLoaded, ownedThemes, themeKey, setTheme]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <Tabs
      screenListeners={{ tabPress: () => void playSfx('tap', 0.3) }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: shade(colors.background, 0.7),
          borderTopColor: colors.border,
          borderTopWidth: PIXEL,
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
            fontSize: pixelSize(9),
            fontFamily: fonts.bold,
          },
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: tabIcon('📊', T.tab_stats),
          title: T.tab_stats,
          tabBarLabel: T.tab_stats,
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
            fontSize: pixelSize(9),
            fontFamily: fonts.bold,
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
            fontSize: pixelSize(9),
            fontFamily: fonts.bold,
          },
        }}
      />
    </Tabs>
  );
}

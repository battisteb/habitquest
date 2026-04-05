import { Tabs } from 'expo-router';
import { colors } from '../../src/ui/theme/tokens';

export default function TabsLayout() {
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
          letterSpacing: 1,
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: 'ME',
          tabBarLabel: 'ME',
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: 'QUESTS',
          tabBarLabel: 'QUESTS',
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'STATS',
          tabBarLabel: 'STATS',
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'SHOP',
          tabBarLabel: 'SHOP',
        }}
      />
      <Tabs.Screen
        name="training"
        options={{
          title: 'TRAIN',
          tabBarLabel: 'TRAIN',
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: 'SOCIAL',
          tabBarLabel: 'SOCIAL',
        }}
      />
    </Tabs>
  );
}

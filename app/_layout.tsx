import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useAuth } from '../src/features/auth/hooks/use-auth';
import { initAuth, authStore$ } from '../src/features/auth/stores/auth-store';
import { hasCompletedOnboarding } from './onboarding';
import { levelUpStore$, dismissLevelUp } from '../src/features/gamification/stores/level-up-store';
import { achievementsStore$ } from '../src/features/gamification/stores/achievements-store';
import { LevelUpOverlay } from '../src/ui/animations/level-up-overlay';
import { AchievementToast } from '../src/ui/animations/achievement-toast';
import {
  configureNotifications,
  applyNotificationPrefs,
  registerPushToken,
} from '../src/features/notifications/utils/notification-service';
import { useWeeklyRecapScheduler } from '../src/features/notifications/hooks/use-weekly-recap-scheduler';
import { colors } from '../src/ui/theme/tokens';
import { ThemeProvider, useTheme } from '../src/ui/theme/theme-context';
import { OfflineBanner } from '../src/ui/components/offline-banner';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && inAuthGroup) {
      if (!hasCompletedOnboarding()) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/profile');
      }
    }
  }, [isAuthenticated, isInitialized, segments]);

  if (!isInitialized) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

function ThemedApp() {
  const { themeKey } = useTheme();
  const showLevelUp = use$(levelUpStore$.showLevelUp);
  const newLevel = use$(levelUpStore$.newLevel);
  const newlyUnlocked = use$(achievementsStore$.newlyUnlocked);
  const currentToast = newlyUnlocked[0] ?? null;

  useWeeklyRecapScheduler();

  useEffect(() => {
    initAuth();
    configureNotifications().then(() => applyNotificationPrefs());
  }, []);

  // Register push token once user is authenticated
  useEffect(() => {
    const userId = authStore$.user.get()?.id;
    if (userId) {
      registerPushToken(userId);
    }
  }, [use$(authStore$.user)?.id]);

  return (
    <>
      <StatusBar style="light" />
      <AuthGuard>
        <Stack
          key={themeKey}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </AuthGuard>
      <LevelUpOverlay
        visible={showLevelUp}
        newLevel={newLevel}
        onComplete={dismissLevelUp}
      />
      <OfflineBanner />
      {currentToast && (
        <AchievementToast
          key={currentToast.id}
          name={currentToast.name}
          description={currentToast.description}
          category={currentToast.category}
          xpReward={currentToast.xp_reward}
          goldReward={currentToast.gold_reward}
          onDismiss={() =>
            achievementsStore$.newlyUnlocked.set((prev) => prev.slice(1))
          }
        />
      )}
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useAuth } from '../src/features/auth/hooks/use-auth';
import { initAuth } from '../src/features/auth/stores/auth-store';
import { hasCompletedOnboarding } from './onboarding';
import { levelUpStore$, dismissLevelUp } from '../src/features/gamification/stores/level-up-store';
import { LevelUpOverlay } from '../src/ui/animations/level-up-overlay';
import {
  configureNotifications,
  applyNotificationPrefs,
} from '../src/features/notifications/utils/notification-service';
import { colors } from '../src/ui/theme/tokens';

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

export default function RootLayout() {
  const showLevelUp = use$(levelUpStore$.showLevelUp);
  const newLevel = use$(levelUpStore$.newLevel);

  useEffect(() => {
    initAuth();
    configureNotifications().then(() => applyNotificationPrefs());
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <AuthGuard>
        <Stack
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
    </>
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

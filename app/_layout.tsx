import { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Jersey10_400Regular } from '@expo-google-fonts/jersey-10';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useAuth } from '../src/features/auth/hooks/use-auth';
import { initAuth, authStore$ } from '../src/features/auth/stores/auth-store';
import { hasCompletedOnboarding } from '../src/features/onboarding/onboarding-state';
import { savePendingInvite, takePendingInvite } from '../src/features/social/utils/invite';
import { levelUpStore$, dismissLevelUp } from '../src/features/gamification/stores/level-up-store';
import { streakMilestoneStore$, dismissStreakMilestone } from '../src/features/gamification/stores/streak-milestone-store';
import { achievementsStore$ } from '../src/features/gamification/stores/achievements-store';
import { LevelUpOverlay } from '../src/ui/animations/level-up-overlay';
import { StreakMilestoneOverlay } from '../src/ui/animations/streak-milestone-overlay';
import { AchievementToast } from '../src/ui/animations/achievement-toast';
import {
  configureNotifications,
  applyNotificationPrefs,
  registerPushToken,
} from '../src/features/notifications/utils/notification-service';
import { useWeeklyRecapScheduler } from '../src/features/notifications/hooks/use-weekly-recap-scheduler';
import { useNotificationObserver } from '../src/features/notifications/hooks/use-notification-observer';
import { colors } from '../src/ui/theme/tokens';
import { ThemeProvider, useTheme } from '../src/ui/theme/theme-context';
import { OfflineBanner } from '../src/ui/components/offline-banner';
import { initPurchases } from '../src/features/monetization/stores/subscription-store';
import { preloadInterstitial, shouldShowAds } from '../src/features/monetization/utils/ad-service';
import { requestTrackingConsent } from '../src/features/monetization/utils/tracking-consent';
import { ResponsiveFrame } from '../src/ui/components/responsive-frame';
import { syncTimezone } from '../src/features/auth/utils/sync-timezone';
import { achievementText } from '../src/lib/i18n/content';
import { lang$ } from '../src/lib/i18n';
import { installWebAlert } from '../src/lib/web-alert';

installWebAlert();

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isInitialized } = useAuth();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';
    // The reset page opens a session from the email link, then asks for the
    // new password: it must not be redirected in between.
    if ((segments as string[])[1] === 'reset-password') return;
    // Segments hold the route pattern ("[code]"): read the real code from the path.
    const inviteCode = /^\/invite\/([^/?#]+)/.exec(pathname)?.[1];

    if (!isAuthenticated && !inAuthGroup) {
      // Keep an invite opened before sign-up; it is accepted after onboarding.
      if (inviteCode) savePendingInvite(decodeURIComponent(inviteCode));
      router.replace('/(auth)/sign-in');
    } else if (isAuthenticated && !inAuthGroup && segments[0] !== 'onboarding' && hasCompletedOnboarding()) {
      const pending = takePendingInvite();
      if (pending) router.replace(`/invite/${pending}`);
    } else if (isAuthenticated && inAuthGroup) {
      if (!hasCompletedOnboarding()) {
        router.replace('/onboarding');
      } else {
        router.replace('/(tabs)/profile');
      }
    }
  }, [isAuthenticated, isInitialized, segments, pathname]);

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
  const showStreakMilestone = use$(streakMilestoneStore$.visible);
  const milestoneStreakCount = use$(streakMilestoneStore$.streakCount);
  const milestoneHabitName = use$(streakMilestoneStore$.habitName);
  const newlyUnlocked = use$(achievementsStore$.newlyUnlocked);
  const currentToast = newlyUnlocked[0] ?? null;
  const authUserId = use$(authStore$.user)?.id;
  const lang = use$(lang$);

  useWeeklyRecapScheduler();
  useNotificationObserver();

  useEffect(() => {
    initAuth();
    configureNotifications().then(() => applyNotificationPrefs());
  }, []);

  // Register push token + init RevenueCat once user is authenticated
  useEffect(() => {
    if (authUserId) {
      void syncTimezone();
      registerPushToken();
      initPurchases(authUserId)
        // Only ask for tracking consent when ads can actually be served
        .then(() => (shouldShowAds() ? requestTrackingConsent() : false))
        .then(() => preloadInterstitial());
    }
  }, [authUserId]);

  return (
    <ResponsiveFrame>
      <StatusBar style={themeKey === 'lifestyle' ? 'dark' : 'light'} />
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
      <StreakMilestoneOverlay
        visible={showStreakMilestone}
        streakCount={milestoneStreakCount}
        habitName={milestoneHabitName}
        onComplete={dismissStreakMilestone}
      />
      <OfflineBanner />
      {currentToast && (
        <AchievementToast
          key={currentToast.id}
          name={achievementText(lang, currentToast).title}
          description={achievementText(lang, currentToast).description}
          category={currentToast.category}
          xpReward={currentToast.xp_reward}
          goldReward={currentToast.gold_reward}
          onDismiss={() =>
            achievementsStore$.newlyUnlocked.set((prev) => prev.slice(1))
          }
        />
      )}
    </ResponsiveFrame>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Jersey10_400Regular });
  // Wait for the pixel font (bundled, so this takes a few ms); on failure the
  // app still starts with the system font.
  if (!fontsLoaded && !fontError) return null;

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

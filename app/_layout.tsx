import { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, Jersey10_400Regular } from '@expo-google-fonts/jersey-10';
import { DotGothic16_400Regular } from '@expo-google-fonts/dotgothic16';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { useAuth } from '../src/features/auth/hooks/use-auth';
import { initAuth, authStore$ } from '../src/features/auth/stores/auth-store';
import { hasCompletedOnboarding } from '../src/features/onboarding/onboarding-state';
import { savePendingInvite, takePendingInvite } from '../src/features/social/utils/invite';
import { levelUpStore$, dismissLevelUp } from '../src/features/gamification/stores/level-up-store';
import { streakMilestoneStore$, dismissStreakMilestone } from '../src/features/gamification/stores/streak-milestone-store';
import { achievementsStore$ } from '../src/features/gamification/stores/achievements-store';
import { TrialOfferHost } from '../src/features/monetization/components/trial-offer-host';
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
import { syncLanguage } from '../src/features/auth/utils/sync-language';
import { achievementText } from '../src/lib/i18n/content';
import { lang$, STARTUP_FONT_SCRIPT } from '../src/lib/i18n';
import { installAppAlert } from '../src/lib/app-alert';
import { PixelDialogHost } from '../src/ui/components/pixel-dialog';

installAppAlert();

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
  const milestoneCategory = use$(streakMilestoneStore$.category);
  const milestoneNewIdentity = use$(streakMilestoneStore$.newIdentity);
  const newlyUnlocked = use$(achievementsStore$.newlyUnlocked);
  const currentToast = newlyUnlocked[0] ?? null;
  const authUserId = use$(authStore$.user)?.id;
  const lang = use$(lang$);
  // Server notifications are written in the player's language.
  useEffect(() => {
    if (authUserId) void syncLanguage(authUserId, lang);
  }, [authUserId, lang]);

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
        category={milestoneCategory}
        newIdentity={milestoneNewIdentity}
        onComplete={dismissStreakMilestone}
      />
      {authUserId && <TrialOfferHost />}
      <OfflineBanner />
      <PixelDialogHost />
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

// The Japanese (2 MB) and Korean (2.6 MB, Galmuri, OFL) pixel fonts are only
// loaded for players who use that language.
const PIXEL_FONTS = {
  latin: { Jersey10_400Regular },
  ja: { Jersey10_400Regular, DotGothic16_400Regular },
  ko: { Jersey10_400Regular, Galmuri11Bold: require('../assets/fonts/Galmuri11-Bold.ttf') },
}[STARTUP_FONT_SCRIPT];

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(PIXEL_FONTS);
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

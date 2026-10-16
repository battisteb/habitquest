import { Redirect } from 'expo-router';
import { hasCompletedOnboarding } from '../src/features/onboarding/onboarding-state';
import { authStore$ } from '../src/features/auth/stores/auth-store';

export default function Index() {
  const onboardingDone = hasCompletedOnboarding(authStore$.user.get());
  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)/profile" />;
}

import { Redirect } from 'expo-router';
import { hasCompletedOnboarding } from './onboarding';

export default function Index() {
  const onboardingDone = hasCompletedOnboarding();
  if (!onboardingDone) {
    return <Redirect href="/onboarding" />;
  }
  return <Redirect href="/(tabs)/profile" />;
}

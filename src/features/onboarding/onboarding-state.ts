import { storage } from '../../lib/storage/mmkv';

const ONBOARDING_KEY = 'onboarding-completed';

export function hasCompletedOnboarding(): boolean {
  return storage.getString(ONBOARDING_KEY) === 'true';
}

export function markOnboardingComplete(): void {
  storage.set(ONBOARDING_KEY, 'true');
}

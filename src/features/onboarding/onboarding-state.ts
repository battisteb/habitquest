import { storage } from '../../lib/storage/mmkv';

const DEVICE_KEY = 'onboarding-completed';
const accountKey = (userId: string) => `onboarding-completed:${userId}`;
const DAY_MS = 24 * 60 * 60 * 1000;

type Account = { id: string; created_at?: string };

/**
 * Whether the welcome flow is done (B9, 2026-10-16). It used to be remembered per device: a new
 * account on a phone that had already seen it skipped it and landed on an empty profile. It now
 * belongs to the account; an account older than a day counts as done (an existing player who
 * reinstalls never sees it again). Without an account (before sign-in), the device's answer.
 */
export function hasCompletedOnboarding(user?: Account | null, now: number = Date.now()): boolean {
  if (!user) return storage.getString(DEVICE_KEY) === 'true';
  if (storage.getString(accountKey(user.id)) === 'true') return true;
  const created = user.created_at ? Date.parse(user.created_at) : NaN;
  return Number.isFinite(created) && now - created > DAY_MS;
}

export function markOnboardingComplete(userId?: string): void {
  storage.set(DEVICE_KEY, 'true');
  if (userId) storage.set(accountKey(userId), 'true');
}

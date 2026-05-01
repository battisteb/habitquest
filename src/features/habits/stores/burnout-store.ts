import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { persistPlugin } from '../../../lib/storage/persist';

/** Days the dismissed banner stays hidden before reappearing if signal persists. */
export const BURNOUT_DISMISS_COOLDOWN_DAYS = 3;

interface BurnoutState {
  /** ISO timestamp of last user dismissal — banner stays hidden for COOLDOWN_DAYS after this */
  lastDismissedAt: string | null;
  /** ISO timestamp of last "Take a break" action — used to celebrate recovery */
  lastBreakTakenAt: string | null;
}

export const burnoutStore$ = observable<BurnoutState>({
  lastDismissedAt: null,
  lastBreakTakenAt: null,
});

syncObservable(burnoutStore$, {
  persist: { name: 'habitquest_burnout', plugin: persistPlugin },
});

export function dismissBurnoutBanner(): void {
  burnoutStore$.lastDismissedAt.set(new Date().toISOString());
}

export function recordBreakTaken(): void {
  burnoutStore$.lastBreakTakenAt.set(new Date().toISOString());
  burnoutStore$.lastDismissedAt.set(new Date().toISOString());
}

export function isDismissalActive(): boolean {
  const ts = burnoutStore$.lastDismissedAt.get();
  if (!ts) return false;
  const elapsedMs = Date.now() - new Date(ts).getTime();
  const cooldownMs = BURNOUT_DISMISS_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
  return elapsedMs < cooldownMs;
}

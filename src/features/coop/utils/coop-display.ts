import type { CoopChallenge } from '../types';

export function coopProgressRatio(challenge: Pick<CoopChallenge, 'progress' | 'target'>): number {
  if (challenge.target <= 0) return 0;
  return Math.min(challenge.progress / challenge.target, 1);
}

/** Whole days left, rounded up (a challenge ending in 3 hours still shows 1 day). */
export function coopDaysLeft(endsAt: string | null, now: Date = new Date()): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - now.getTime();
  return Math.max(Math.ceil(ms / 86_400_000), 0);
}


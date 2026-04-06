import { storage } from '../../../lib/storage/mmkv';

const TIMING_KEY = 'notification-completion-hours';

/**
 * Record the hour at which the user completed habits (call this after completeHabit).
 * Stores last 14 completion hours in MMKV.
 */
export function recordCompletionHour(): void {
  const hour = new Date().getHours();
  const raw = storage.getString(TIMING_KEY);
  const hours: number[] = raw ? JSON.parse(raw) : [];
  hours.push(hour);
  // Keep last 14
  if (hours.length > 14) hours.splice(0, hours.length - 14);
  storage.set(TIMING_KEY, JSON.stringify(hours));
}

/**
 * Returns the optimal notification hour (median of recent completion hours).
 * Falls back to 9 (9am) if no data.
 */
export function getOptimalNotificationHour(): number {
  const raw = storage.getString(TIMING_KEY);
  if (!raw) return 9;
  const hours: number[] = JSON.parse(raw);
  if (hours.length === 0) return 9;
  const sorted = [...hours].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

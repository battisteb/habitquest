/**
 * "YYYY-MM-DD" of the device's local day. The server counts days in the
 * player's time zone (profiles.timezone, synced from the device), so keys
 * like daily quest dates must not use toISOString(), which is the UTC day:
 * in France it is still "yesterday" until 1-2 a.m.
 */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

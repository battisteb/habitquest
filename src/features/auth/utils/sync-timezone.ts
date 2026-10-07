import { Platform } from 'react-native';
import { supabase } from '../../../lib/supabase/client';

/** IANA timezone of the device, e.g. "Europe/Paris". */
export function getDeviceTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

/**
 * Streaks and daily limits are computed server-side on the player's local day,
 * so the server needs the device timezone. Best effort: the profile keeps its
 * previous value (UTC by default) if this fails.
 */
export async function syncTimezone(): Promise<void> {
  const timezone = getDeviceTimezone();
  if (!timezone) return;
  try {
    await supabase.rpc('set_timezone', { p_timezone: timezone });
  } catch {
    // Offline: retried on next launch.
  }
}

/**
 * Records the platform the player opened the app on (web, ios or android) for
 * the aggregate founder metrics. Private: other players cannot read it.
 */
export async function trackSession(): Promise<void> {
  const platform = Platform.OS;
  if (platform !== 'web' && platform !== 'ios' && platform !== 'android') return;
  try {
    await supabase.rpc('track_session', { p_platform: platform });
  } catch {
    // Offline: recorded on next launch.
  }
}

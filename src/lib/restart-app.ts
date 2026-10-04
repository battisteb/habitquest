import { DevSettings, Platform } from 'react-native';

/**
 * Restarts the app (web: reloads the page). Used when switching to or from
 * Japanese or Korean: the pixel font and its size are chosen once at startup (every
 * style is built from them), so the app restarts to apply the new font.
 */
export function restartApp(): void {
  if (Platform.OS === 'web') {
    window.location.reload();
    return;
  }
  // Production builds: expo-updates reloads the current bundle.
  try {
    const Updates = require('expo-updates');
    Updates.reloadAsync().catch(() => DevSettings.reload());
  } catch {
    DevSettings.reload();
  }
}

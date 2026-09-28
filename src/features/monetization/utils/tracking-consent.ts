import { Platform } from 'react-native';

// Personalized ads require App Tracking Transparency consent on iOS.
// Until the prompt has been answered, only non-personalized ads are requested.
let _trackingAllowed = Platform.OS === 'android';

/**
 * Shows the iOS App Tracking Transparency prompt (once — iOS remembers the answer)
 * and records whether personalized ads may be requested.
 */
export async function requestTrackingConsent(): Promise<boolean> {
  if (Platform.OS !== 'ios') return _trackingAllowed;
  try {
    const { requestTrackingPermissionsAsync } = require('expo-tracking-transparency');
    const { granted } = await requestTrackingPermissionsAsync();
    _trackingAllowed = granted;
  } catch {
    _trackingAllowed = false;
  }
  return _trackingAllowed;
}

export function canPersonalizeAds(): boolean {
  return _trackingAllowed;
}

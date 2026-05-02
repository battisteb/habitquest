import { Platform } from 'react-native';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getHaptics(): any | null {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics');
  } catch {
    return null;
  }
}

const H = getHaptics();

export function hapticSuccess() {
  H?.notificationAsync(H.NotificationFeedbackType?.Success);
}

export function hapticMedium() {
  H?.impactAsync(H.ImpactFeedbackStyle?.Medium);
}

export function hapticHeavy() {
  H?.impactAsync(H.ImpactFeedbackStyle?.Heavy);
}

export function hapticLight() {
  H?.impactAsync(H.ImpactFeedbackStyle?.Light);
}

export function hapticWarning() {
  H?.notificationAsync(H.NotificationFeedbackType?.Warning);
}

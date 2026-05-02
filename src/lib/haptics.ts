import { Platform } from 'react-native';

async function getHaptics() {
  if (Platform.OS === 'web') return null;
  return await import('expo-haptics');
}

export async function hapticSuccess() {
  const H = await getHaptics();
  H?.notificationAsync(H.NotificationFeedbackType.Success);
}

export async function hapticMedium() {
  const H = await getHaptics();
  H?.impactAsync(H.ImpactFeedbackStyle.Medium);
}

export async function hapticHeavy() {
  const H = await getHaptics();
  H?.impactAsync(H.ImpactFeedbackStyle.Heavy);
}

export async function hapticLight() {
  const H = await getHaptics();
  H?.impactAsync(H.ImpactFeedbackStyle.Light);
}

export async function hapticWarning() {
  const H = await getHaptics();
  H?.notificationAsync(H.NotificationFeedbackType.Warning);
}

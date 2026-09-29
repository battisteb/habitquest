import { Alert, Platform, type AlertButton } from 'react-native';

/**
 * react-native-web's Alert.alert does nothing: every alert of the app
 * (errors, confirmations) was silently lost on the web version.
 * Maps it to the browser dialogs: one button → alert, several → confirm
 * (OK runs the non-cancel button, Cancel runs the cancel one).
 */
export function webAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  const text = message ? `${title}\n\n${message}` : title;
  if (!buttons || buttons.length <= 1) {
    window.alert(text);
    buttons?.[0]?.onPress?.();
    return;
  }
  const cancel = buttons.find((b) => b.style === 'cancel');
  const confirm = [...buttons].reverse().find((b) => b.style !== 'cancel') ?? buttons[buttons.length - 1];
  if (window.confirm(text)) confirm.onPress?.();
  else cancel?.onPress?.();
}

export function installWebAlert(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    Alert.alert = webAlert;
  }
}

import { Alert, type AlertButton } from 'react-native';
import { observable } from '@legendapp/state';

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: AlertButton[];
}

/** Queue of dialogs waiting to be shown by <PixelDialogHost /> (one at a time). */
export const dialogStore$ = observable<{ queue: DialogRequest[] }>({ queue: [] });

let nextId = 1;

/** Same signature as Alert.alert, shown as an in-app pixel dialog. */
export function showDialog(title: string, message?: string, buttons?: AlertButton[]): void {
  const list = buttons && buttons.length > 0 ? buttons : [{ text: 'OK' }];
  dialogStore$.queue.push({ id: nextId++, title, message, buttons: list });
}

/** Closes the current dialog, then runs the chosen button. */
export function answerDialog(id: number, button?: AlertButton): void {
  dialogStore$.queue.set((q) => q.filter((d) => d.id !== id));
  button?.onPress?.();
}

/**
 * Every Alert.alert of the app becomes an in-app pixel dialog, on every
 * platform: react-native-web's Alert did nothing, and the system/browser
 * popups broke the pixel art direction.
 */
export function installAppAlert(): void {
  Alert.alert = showDialog;
}

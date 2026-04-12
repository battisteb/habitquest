import { use$ } from '@legendapp/state/react';
import { notificationsStore$ } from '../stores/notifications-store';

export function useNotificationCount(): number {
  return use$(notificationsStore$.unreadCount);
}

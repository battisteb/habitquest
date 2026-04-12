jest.mock('../../../lib/supabase/client', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../auth/stores/auth-store', () => ({
  authStore$: { user: { get: () => ({ id: 'user-123' }) } },
}));

jest.mock('@legendapp/state/react', () => ({
  use$: (obs: { get: () => unknown }) => obs.get(),
}));

import { notificationsStore$ } from '../stores/notifications-store';
import { useNotificationCount } from '../hooks/use-notification-count';

describe('useNotificationCount', () => {
  beforeEach(() => {
    notificationsStore$.unreadCount.set(0);
  });

  it('returns 0 when there are no unread notifications', () => {
    notificationsStore$.unreadCount.set(0);
    expect(useNotificationCount()).toBe(0);
  });

  it('returns the correct unread count', () => {
    notificationsStore$.unreadCount.set(5);
    expect(useNotificationCount()).toBe(5);
  });

  it('reflects store updates', () => {
    notificationsStore$.unreadCount.set(3);
    expect(useNotificationCount()).toBe(3);
    notificationsStore$.unreadCount.set(1);
    expect(useNotificationCount()).toBe(1);
  });
});

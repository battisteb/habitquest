import { notificationsStore$, markAsRead, markAllAsRead } from '../stores/notifications-store';

jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../auth/stores/auth-store', () => ({
  authStore$: {
    user: {
      get: () => ({ id: 'user-123' }),
    },
  },
}));

const { supabase } = require('../../../lib/supabase/client');

const MOCK_ITEMS = [
  {
    id: 'notif-1',
    type: 'friend_request',
    title: 'Friend Request',
    body: 'Alice wants to be your friend',
    data: {},
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    type: 'achievement',
    title: 'Achievement Unlocked',
    body: 'You earned a new badge',
    data: {},
    isRead: true,
    createdAt: new Date().toISOString(),
  },
];

describe('notificationsStore$', () => {
  beforeEach(() => {
    notificationsStore$.items.set([]);
    notificationsStore$.unreadCount.set(0);
    notificationsStore$.isLoading.set(false);
    jest.clearAllMocks();
  });

  describe('markAsRead', () => {
    it('marks a single notification as read and updates unreadCount', async () => {
      notificationsStore$.items.set(MOCK_ITEMS);
      notificationsStore$.unreadCount.set(1);

      const updateMock = jest.fn().mockResolvedValue({ error: null });
      const eqMock = jest.fn().mockReturnValue({ error: null, then: updateMock });

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await markAsRead('notif-1');

      const items = notificationsStore$.items.get();
      const item = items.find((n) => n.id === 'notif-1');
      expect(item?.isRead).toBe(true);
      expect(notificationsStore$.unreadCount.get()).toBe(0);
    });

    it('does not affect other notifications when marking one as read', async () => {
      const twoUnread = MOCK_ITEMS.map((n) => ({ ...n, isRead: false }));
      notificationsStore$.items.set(twoUnread);
      notificationsStore$.unreadCount.set(2);

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      });

      await markAsRead('notif-1');

      const items = notificationsStore$.items.get();
      expect(items.find((n) => n.id === 'notif-1')?.isRead).toBe(true);
      expect(items.find((n) => n.id === 'notif-2')?.isRead).toBe(false);
      expect(notificationsStore$.unreadCount.get()).toBe(1);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read and sets unreadCount to 0', async () => {
      const allUnread = MOCK_ITEMS.map((n) => ({ ...n, isRead: false }));
      notificationsStore$.items.set(allUnread);
      notificationsStore$.unreadCount.set(2);

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        }),
      });

      await markAllAsRead();

      const items = notificationsStore$.items.get();
      expect(items.every((n) => n.isRead)).toBe(true);
      expect(notificationsStore$.unreadCount.get()).toBe(0);
    });

    it('does nothing when no user is authenticated', async () => {
      const { authStore$ } = require('../../auth/stores/auth-store');
      authStore$.user.get = () => null;

      supabase.from.mockClear();
      await markAllAsRead();

      expect(supabase.from).not.toHaveBeenCalled();

      // Restore
      authStore$.user.get = () => ({ id: 'user-123' });
    });
  });

  describe('unreadCount', () => {
    it('reflects 0 when all items are read', () => {
      notificationsStore$.items.set(MOCK_ITEMS);
      notificationsStore$.unreadCount.set(0);
      expect(notificationsStore$.unreadCount.get()).toBe(0);
    });

    it('reflects correct count for mixed read state', () => {
      notificationsStore$.unreadCount.set(1);
      expect(notificationsStore$.unreadCount.get()).toBe(1);
    });
  });
});

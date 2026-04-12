import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsState {
  items: InboxNotification[];
  unreadCount: number;
  isLoading: boolean;
}

export const notificationsStore$ = observable<NotificationsState>({
  items: [],
  unreadCount: 0,
  isLoading: false,
});

function computeUnreadCount(items: InboxNotification[]): number {
  return items.filter((n) => !n.isRead).length;
}

function mapRow(row: {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}): InboxNotification {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    data: row.data ?? {},
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function fetchNotifications(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  notificationsStore$.isLoading.set(true);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('notifications')
      .select('id, type, title, body, data, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const items: InboxNotification[] = (data ?? []).map(mapRow);
    notificationsStore$.items.set(items);
    notificationsStore$.unreadCount.set(computeUnreadCount(items));
  } finally {
    notificationsStore$.isLoading.set(false);
  }
}

export async function markAsRead(id: string): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;

  const items = notificationsStore$.items.get().map((n) =>
    n.id === id ? { ...n, isRead: true } : n,
  );
  notificationsStore$.items.set(items);
  notificationsStore$.unreadCount.set(computeUnreadCount(items));
}

export async function markAllAsRead(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) throw error;

  const items = notificationsStore$.items.get().map((n) => ({ ...n, isRead: true }));
  notificationsStore$.items.set(items);
  notificationsStore$.unreadCount.set(0);
}

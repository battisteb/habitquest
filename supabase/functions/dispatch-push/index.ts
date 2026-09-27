import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

// Called by the notifications insert trigger (pg_net) — never by the app.
// Deploy with --no-verify-jwt: the shared secret replaces JWT auth.
serve(async (req: Request) => {
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET') ?? '';
  if (!secret || req.headers.get('x-dispatch-secret') !== secret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let notificationId: unknown;
  try {
    ({ notification_id: notificationId } = await req.json());
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }
  if (typeof notificationId !== 'string') {
    return json({ error: 'notification_id is required' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: notification } = await supabase
    .from('notifications')
    .select('user_id, title, body, data')
    .eq('id', notificationId)
    .single();
  if (!notification) {
    return json({ error: 'Notification not found' }, 404);
  }

  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', notification.user_id)
    .maybeSingle();
  if (!tokenRow) {
    return json({ sent: false, reason: 'no_token' }, 200);
  }

  const response = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: tokenRow.token,
      title: notification.title,
      body: notification.body,
      sound: 'default',
      data: notification.data ?? {},
    }),
  });
  if (!response.ok) {
    return json({ error: `Expo push error ${response.status}` }, 502);
  }

  const { data: ticket } = (await response.json()) as { data: ExpoPushTicket };
  if (ticket?.details?.error === 'DeviceNotRegistered') {
    // The app was uninstalled or the token rotated: stop pushing to it.
    await supabase.from('push_tokens').delete().eq('token', tokenRow.token);
  }

  return json({ sent: ticket?.status === 'ok' }, 200);
});

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

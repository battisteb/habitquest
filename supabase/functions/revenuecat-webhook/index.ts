import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { premiumUpdate } from './premium-update.ts';

// RevenueCat → Supabase: the only writer of profiles.subscription_* (clients
// cannot update those columns). Configure in RevenueCat → Integrations →
// Webhooks with the URL of this function and "Authorization: Bearer <secret>".
// Deploy with --no-verify-jwt; REVENUECAT_WEBHOOK_SECRET authenticates calls.

const ENTITLEMENT_PREMIUM = 'premium';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RevenueCatEvent {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  aliases?: string[];
  entitlement_ids?: string[] | null;
  product_id?: string | null;
  expiration_at_ms?: number | null;
}

serve(async (req: Request) => {
  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET') ?? '';
  if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) {
    return json({ error: 'Unauthorized' }, 401);
  }

  let event: RevenueCatEvent;
  try {
    ({ event } = await req.json());
  } catch {
    return json({ error: 'Invalid body' }, 400);
  }
  if (!event?.type) {
    return json({ error: 'Missing event' }, 400);
  }
  if (event.type === 'TEST') {
    return json({ ok: true, test: true }, 200);
  }

  // The app calls Purchases.configure({ appUserID: <Supabase user id> }).
  const userId = [event.app_user_id, event.original_app_user_id, ...(event.aliases ?? [])]
    .find((id) => typeof id === 'string' && UUID.test(id));
  if (!userId) {
    return json({ ok: true, skipped: 'anonymous user' }, 200);
  }
  if (event.entitlement_ids && !event.entitlement_ids.includes(ENTITLEMENT_PREMIUM)) {
    return json({ ok: true, skipped: 'other entitlement' }, 200);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  // Current status: a lifetime Premium is never taken away by a subscription event.
  const { data: current, error: readError } = await supabase
    .from('profiles')
    .select('subscription_status, subscription_expires_at')
    .eq('id', userId)
    .maybeSingle();
  if (readError) {
    return json({ error: 'Read failed' }, 500);
  }
  const update = premiumUpdate(event, current);
  if (!update) {
    return json({ ok: true, skipped: 'lifetime premium kept' }, 200);
  }

  const { error } = await supabase
    .from('profiles')
    .update({ ...update, revenue_cat_id: event.original_app_user_id ?? event.app_user_id })
    .eq('id', userId);

  // A non-2xx makes RevenueCat retry later.
  if (error) {
    return json({ error: 'Update failed' }, 500);
  }
  return json({ ok: true, status: update.subscription_status }, 200);
});

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

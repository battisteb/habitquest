import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

interface Profile {
  id: string;
  xp: number;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  sound: string;
  data: Record<string, unknown>;
}

interface ExpoPushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: Record<string, unknown>;
}

interface ExpoPushResponse {
  data: ExpoPushTicket[];
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

async function sendNotificationChunk(messages: ExpoPushMessage[]): Promise<{ sent: number; errors: number }> {
  const response = await fetch(EXPO_PUSH_API, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Expo Push API error ${response.status}: ${text}`);
  }

  const result: ExpoPushResponse = await response.json();
  let sent = 0;
  let errors = 0;

  for (const ticket of result.data) {
    if (ticket.status === 'ok') {
      sent++;
    } else {
      errors++;
      console.error('weekly-reset: push ticket error', ticket.message, ticket.details);
    }
  }

  return { sent, errors };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('weekly-reset: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: missing env vars' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Query all profiles (service role bypasses RLS)
    console.log('weekly-reset: fetching all profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, xp');

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const allProfiles: Profile[] = profiles ?? [];
    console.log(`weekly-reset: found ${allProfiles.length} profiles`);

    // 2. Collect valid Expo push tokens
    // push_token column may not exist yet — access via type cast
    const validTokens: string[] = [];
    for (const profile of allProfiles) {
      const pushToken = (profile as unknown as Record<string, unknown>).push_token;
      if (typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken[')) {
        validTokens.push(pushToken);
      }
    }

    console.log(`weekly-reset: ${validTokens.length} profiles have valid push tokens`);

    // 3. Build notification messages
    const NOTIFICATION_TITLE = 'Weekly Reset';
    const NOTIFICATION_BODY = '🏆 New week, new competition! Your weekly rank resets now. Good luck!';

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      title: NOTIFICATION_TITLE,
      body: NOTIFICATION_BODY,
      sound: 'default',
      data: { type: 'weekly_reset', timestamp: new Date().toISOString() },
    }));

    // 4. Send in chunks of 100
    let totalSent = 0;
    let totalErrors = 0;

    if (messages.length > 0) {
      const chunks = chunkArray(messages, CHUNK_SIZE);
      console.log(`weekly-reset: sending ${messages.length} notifications in ${chunks.length} chunk(s)`);

      for (let i = 0; i < chunks.length; i++) {
        console.log(`weekly-reset: processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} messages)`);
        const { sent, errors } = await sendNotificationChunk(chunks[i]);
        totalSent += sent;
        totalErrors += errors;
      }
    } else {
      console.log('weekly-reset: no push tokens found, skipping notifications');
    }

    // 5. Log results
    console.log(
      `weekly-reset: complete — profiles=${allProfiles.length} tokens=${validTokens.length} sent=${totalSent} errors=${totalErrors}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        profiles: allProfiles.length,
        tokensFound: validTokens.length,
        sent: totalSent,
        errors: totalErrors,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('weekly-reset: unexpected error', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

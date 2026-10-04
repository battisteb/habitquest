import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { ALERT_TEXT, usersAtRisk, type AlertHabit, type AlertProfile } from './at-risk.ts';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

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
      console.error('daily-streak-alert: push ticket error', ticket.message, ticket.details);
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

  // Scheduled job, server-to-server only: it pushes to every player, so
  // anyone holding the public anon key could otherwise spam the whole base.
  // The app already schedules these reminders locally (notification-service).
  if (!serviceRoleKey || req.headers.get('Authorization') !== `Bearer ${serviceRoleKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('daily-streak-alert: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: missing env vars' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const now = new Date();

    // 1. Quests with a running streak (the pure rules are in at-risk.ts).
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('id, user_id, frequency, days, is_archived, is_paused, streaks!inner(current_count)')
      .eq('is_archived', false)
      .eq('is_paused', false)
      .gt('streaks.current_count', 0);
    if (habitsError) {
      throw new Error(`Failed to fetch habits with streaks: ${habitsError.message}`);
    }
    const habits: AlertHabit[] = (habitsData ?? []).map((h: Record<string, unknown>) => {
      const streak = h.streaks as { current_count: number } | { current_count: number }[] | null;
      const count = Array.isArray(streak) ? (streak[0]?.current_count ?? 0) : (streak?.current_count ?? 0);
      return { ...(h as unknown as AlertHabit), current_count: count };
    });
    const userIds = [...new Set(habits.map((h) => h.user_id))];
    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ success: true, usersAtRisk: 0, sent: 0, errors: 0, timestamp: now.toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 2. Their time zone and language, and the completions of the last two days
    //    (enough to cover "today" in every time zone).
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, timezone, language')
      .in('id', userIds);
    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }
    const profiles: AlertProfile[] = profilesData ?? [];
    const { data: completionsData, error: completionsError } = await supabase
      .from('completions')
      .select('habit_id, completed_at')
      .in('habit_id', habits.map((h) => h.id))
      .gte('completed_at', new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString());
    if (completionsError) {
      throw new Error(`Failed to fetch completions: ${completionsError.message}`);
    }

    // 3. Players with a quest due today (their local day) not done yet.
    const atRiskUserIds = usersAtRisk(habits, profiles, completionsData ?? [], now);
    console.log(`daily-streak-alert: ${atRiskUserIds.size} users have at-risk streaks`);
    if (atRiskUserIds.size === 0) {
      return new Response(
        JSON.stringify({ success: true, usersAtRisk: 0, sent: 0, errors: 0, timestamp: now.toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 4. Their push tokens, and the message in their language.
    const { data: tokensData, error: tokensError } = await supabase
      .from('push_tokens')
      .select('user_id, token')
      .in('user_id', Array.from(atRiskUserIds));
    if (tokensError) {
      throw new Error(`Failed to fetch push tokens: ${tokensError.message}`);
    }
    const langOf = new Map(profiles.map((p) => [p.id, p.language === 'fr' || p.language === 'ja' || p.language === 'ko' ? p.language : 'en'] as const));
    const messages: ExpoPushMessage[] = [];
    for (const row of tokensData ?? []) {
      const pushToken = row.token;
      if (typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken[')) {
        const text = ALERT_TEXT[langOf.get(row.user_id) ?? 'en'];
        messages.push({
          to: pushToken,
          title: text.title,
          body: text.body,
          sound: 'default',
          data: { type: 'streak_alert', timestamp: now.toISOString() },
        });
      }
    }
    console.log(`daily-streak-alert: ${messages.length} users have valid push tokens`);

    // 7. Send notifications in chunks of 100
    let totalSent = 0;
    let totalErrors = 0;

    if (messages.length > 0) {
      const chunks = chunkArray(messages, CHUNK_SIZE);
      console.log(`daily-streak-alert: sending ${messages.length} notifications in ${chunks.length} chunk(s)`);

      for (let i = 0; i < chunks.length; i++) {
        console.log(`daily-streak-alert: processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} messages)`);
        const { sent, errors } = await sendNotificationChunk(chunks[i]);
        totalSent += sent;
        totalErrors += errors;
      }
    } else {
      console.log('daily-streak-alert: no valid push tokens found, skipping notifications');
    }

    console.log(
      `daily-streak-alert: complete — usersAtRisk=${atRiskUserIds.size} tokensFound=${messages.length} sent=${totalSent} errors=${totalErrors}`,
    );

    return new Response(
      JSON.stringify({
        success: true,
        usersAtRisk: atRiskUserIds.size,
        tokensFound: messages.length,
        sent: totalSent,
        errors: totalErrors,
        timestamp: now.toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('daily-streak-alert: unexpected error', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

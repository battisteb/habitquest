import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

const NOTIFICATION_TITLE = '⚡ Streak at risk!';
const NOTIFICATION_BODY = 'Complete your habits before midnight to keep your streak alive!';

interface HabitWithStreak {
  id: string;
  user_id: string;
  streaks: Array<{ current_count: number }>;
}

interface Completion {
  habit_id: string;
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

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('daily-streak-alert: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: missing env vars' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    // 1. Build today's date range in UTC (midnight to midnight)
    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    const todayEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

    console.log(`daily-streak-alert: date range ${todayStart.toISOString()} — ${todayEnd.toISOString()}`);

    // 2. Query all habits that have an active streak (current_count > 0)
    console.log('daily-streak-alert: fetching habits with active streaks...');
    const { data: habitsData, error: habitsError } = await supabase
      .from('habits')
      .select('id, user_id, streaks(current_count)')
      .gt('streaks.current_count', 0);

    if (habitsError) {
      throw new Error(`Failed to fetch habits with streaks: ${habitsError.message}`);
    }

    const habits: HabitWithStreak[] = (habitsData ?? []) as HabitWithStreak[];

    // Filter to habits that actually have a streak row with current_count > 0
    const habitsWithActiveStreak = habits.filter(
      (h) => Array.isArray(h.streaks) && h.streaks.some((s) => s.current_count > 0),
    );

    console.log(`daily-streak-alert: ${habitsWithActiveStreak.length} habits have active streaks`);

    if (habitsWithActiveStreak.length === 0) {
      return new Response(
        JSON.stringify({ success: true, usersNotified: 0, sent: 0, errors: 0, timestamp: now.toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const habitIds = habitsWithActiveStreak.map((h) => h.id);

    // 3. Fetch today's completions for those habits
    console.log('daily-streak-alert: fetching today completions...');
    const { data: completionsData, error: completionsError } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .in('habit_id', habitIds)
      .gte('completed_at', todayStart.toISOString())
      .lte('completed_at', todayEnd.toISOString());

    if (completionsError) {
      throw new Error(`Failed to fetch completions: ${completionsError.message}`);
    }

    const completions: Completion[] = (completionsData ?? []) as Completion[];
    const completedHabitIds = new Set(completions.map((c) => c.habit_id));

    // 4. Collect unique user_ids of habits with active streak but no completion today
    const atRiskUserIds = new Set<string>();
    for (const habit of habitsWithActiveStreak) {
      if (!completedHabitIds.has(habit.id)) {
        atRiskUserIds.add(habit.user_id);
      }
    }

    console.log(`daily-streak-alert: ${atRiskUserIds.size} users have at-risk streaks`);

    if (atRiskUserIds.size === 0) {
      return new Response(
        JSON.stringify({ success: true, usersAtRisk: 0, sent: 0, errors: 0, timestamp: now.toISOString() }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // 5. Fetch profiles for at-risk users to get push tokens
    console.log('daily-streak-alert: fetching profiles for at-risk users...');
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, push_token')
      .in('id', Array.from(atRiskUserIds));

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const profiles = profilesData ?? [];

    // 6. Build push messages for users with valid Expo push tokens
    const messages: ExpoPushMessage[] = [];
    for (const profile of profiles) {
      const pushToken = (profile as unknown as Record<string, unknown>).push_token;
      if (typeof pushToken === 'string' && pushToken.startsWith('ExponentPushToken[')) {
        messages.push({
          to: pushToken,
          title: NOTIFICATION_TITLE,
          body: NOTIFICATION_BODY,
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

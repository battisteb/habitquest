import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
const CHUNK_SIZE = 100;

interface PushRequestBody {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: string;
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

async function sendChunk(messages: ExpoPushMessage[]): Promise<ExpoPushTicket[]> {
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
  return result.data;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const payload: PushRequestBody = await req.json();
    const { tokens, title, body, data } = payload;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return new Response(
        JSON.stringify({ error: 'tokens must be a non-empty array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const validTokens = tokens.filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken['));
    console.log(`send-push-notification: ${validTokens.length} valid tokens out of ${tokens.length}`);

    const messages: ExpoPushMessage[] = validTokens.map((token) => ({
      to: token,
      title,
      body,
      sound: 'default',
      ...(data ? { data } : {}),
    }));

    const chunks = chunkArray(messages, CHUNK_SIZE);
    let sent = 0;
    let errors = 0;

    for (const chunk of chunks) {
      const tickets = await sendChunk(chunk);
      for (const ticket of tickets) {
        if (ticket.status === 'ok') {
          sent++;
        } else {
          errors++;
          console.error('Push ticket error:', ticket.message, ticket.details);
        }
      }
    }

    console.log(`send-push-notification: sent=${sent} errors=${errors}`);

    return new Response(
      JSON.stringify({ sent, errors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('send-push-notification: unexpected error', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

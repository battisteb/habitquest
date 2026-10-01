import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from '../../lib/supabase/client';
import { lang$ } from '../../lib/i18n';

export type SupportCategory = 'bug' | 'idea' | 'other';
export type SupportStatus = 'new' | 'read' | 'done';

export interface SupportMessage {
  id: string;
  category: SupportCategory;
  message: string;
  status: SupportStatus;
  createdAt: string;
}

export const SUPPORT_MIN_LENGTH = 5;
export const SUPPORT_MAX_LENGTH = 2000;

/** Why a message was not sent, for the screen to explain it. */
export type SupportError = 'too_short' | 'limit' | 'network';

/**
 * Sends a support message (problem, idea, other) to the team. The server
 * keeps it unread, limits players to 5 per day and adds nothing personal
 * beyond the account; platform, version and language help reproduce bugs.
 */
export async function sendSupportMessage(
  category: SupportCategory,
  message: string,
): Promise<SupportError | null> {
  const text = message.trim();
  if (text.length < SUPPORT_MIN_LENGTH) return 'too_short';
  const { error } = await supabase.from('support_messages').insert({
    category,
    message: text.slice(0, SUPPORT_MAX_LENGTH),
    platform: Platform.OS,
    app_version: Constants.expoConfig?.version ?? null,
    language: lang$.get(),
  });
  if (!error) return null;
  return /too many/i.test(error.message) ? 'limit' : 'network';
}

/** The player's own messages, newest first, with the team's status. */
export async function fetchMySupportMessages(): Promise<SupportMessage[]> {
  const { data, error } = await supabase
    .from('support_messages')
    .select('id, category, message, status, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    category: row.category as SupportCategory,
    message: row.message,
    status: row.status as SupportStatus,
    createdAt: row.created_at,
  }));
}

import { Platform, Share } from 'react-native';
import { supabase } from '../../../lib/supabase/client';
import { storage } from '../../../lib/storage/mmkv';

/** Public web app: the link opens in any browser, with or without the app. */
export const INVITE_BASE_URL = 'https://habitquest.expo.app';

const PENDING_INVITE_KEY = 'pending-invite-code';

export function inviteUrl(code: string): string {
  return `${INVITE_BASE_URL}/invite/${encodeURIComponent(code)}`;
}

/** The current player's secret invite code (created on first call). */
export async function getInviteCode(): Promise<string> {
  const { data, error } = await supabase.rpc('get_invite_code');
  if (error || !data) throw error ?? new Error('No invite code');
  return data;
}

/**
 * Opens the native share sheet with the invite link. On browsers without
 * Web Share, copies the link instead. Resolves with how it was shared.
 */
export async function shareInvite(message: string): Promise<'shared' | 'copied'> {
  const url = inviteUrl(await getInviteCode());
  const text = `${message} ${url}`;
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as Navigator | undefined;
    if (nav?.share) {
      await nav.share({ text, url });
      return 'shared';
    }
    await nav?.clipboard?.writeText(text);
    return 'copied';
  }
  await Share.share({ message: text, url });
  return 'shared';
}

export type InviteResult =
  | { status: 'friends' | 'already_friends'; username: string; user_id: string }
  | { status: 'self'; username: string }
  | { status: 'invalid' };

export async function acceptInvite(code: string): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('accept_invite', { p_code: code });
  if (error) throw error;
  return data as unknown as InviteResult;
}

/** Keeps an invite opened before sign-up, to accept it after onboarding. */
export function savePendingInvite(code: string): void {
  storage.set(PENDING_INVITE_KEY, code);
}

export function takePendingInvite(): string | null {
  const code = storage.getString(PENDING_INVITE_KEY) ?? null;
  if (code) storage.delete(PENDING_INVITE_KEY);
  return code;
}

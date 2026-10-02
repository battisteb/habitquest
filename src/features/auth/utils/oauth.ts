import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../../../lib/supabase/client';

/**
 * "Continue with Google" (ADR 018). Supabase does the OAuth dance in the
 * browser and comes back with the session in the link fragment
 * (`#access_token=…&refresh_token=…`), like the password reset link.
 */

export type OAuthProvider = 'google';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Path the provider sends the player back to (web route and app deep link). */
export const OAUTH_CALLBACK_PATH = 'auth-callback';

/** Session tokens from a link fragment or a full URL; null when absent. */
export function readSessionTokens(urlOrHash: string): { access_token: string; refresh_token: string } | null {
  const i = urlOrHash.indexOf('#');
  const params = new URLSearchParams(i >= 0 ? urlOrHash.slice(i + 1) : urlOrHash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  return access_token && refresh_token ? { access_token, refresh_token } : null;
}

/** Error sent back by the provider (the player cancelled, provider off…). */
export function readOAuthError(urlOrHash: string): string | null {
  const parts = urlOrHash.split(/[?#]/).slice(1).join('&');
  const params = new URLSearchParams(parts);
  return params.get('error_description') ?? params.get('error');
}

/**
 * Providers turned on in the Supabase project. The button only shows once
 * Battiste has set Google up, so the app never offers a broken sign-in.
 */
export async function fetchEnabledProviders(): Promise<Record<OAuthProvider, boolean>> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY } });
    const body = (await res.json()) as { external?: Record<string, boolean> };
    return { google: !!body.external?.google };
  } catch {
    return { google: false };
  }
}

/**
 * Starts the sign-in. On the web the page goes to Google and comes back to
 * /auth-callback; in the app an in-app browser opens and the session is
 * stored when it closes. Resolves false if the player cancelled.
 */
export async function signInWithProvider(provider: OAuthProvider): Promise<boolean> {
  if (Platform.OS === 'web') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/${OAUTH_CALLBACK_PATH}` },
    });
    if (error) throw error;
    return true; // the page is leaving
  }

  const redirectTo = Linking.createURL(OAUTH_CALLBACK_PATH);
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw error ?? new Error('No sign-in URL');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return false;
  const failure = readOAuthError(result.url);
  if (failure) throw new Error(failure);
  const tokens = readSessionTokens(result.url);
  if (!tokens) return false;
  const { error: sessionError } = await supabase.auth.setSession(tokens);
  if (sessionError) throw sessionError;
  return true;
}

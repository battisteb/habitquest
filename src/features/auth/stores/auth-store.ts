import { observable } from '@legendapp/state';
import { Platform } from 'react-native';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../../lib/supabase/client';
import { clearUserData } from '../../../lib/storage/user-data';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

export const authStore$ = observable<AuthState>({
  session: null,
  user: null,
  isLoading: false,
  isInitialized: false,
});

export async function initAuth() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  authStore$.session.set(session);
  authStore$.user.set(session?.user ?? null);
  authStore$.isInitialized.set(true);

  supabase.auth.onAuthStateChange((event, session) => {
    authStore$.session.set(session);
    authStore$.user.set(session?.user ?? null);
    // Covers manual sign-out, account deletion and expired sessions alike.
    if (event === 'SIGNED_OUT') {
      void clearUserData();
    }
  });
}

/** Hero names: 3 to 20 letters, digits or _, unique. Same rules at sign-up and in profile edit. */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

export function usernameProblem(name: string): 'length' | 'chars' | null {
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX) return 'length';
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return 'chars';
  return null;
}

export async function signUp(email: string, password: string, username: string) {
  authStore$.isLoading.set(true);
  try {
    const name = username.trim();
    const problem = usernameProblem(name);
    if (problem) {
      throw Object.assign(new Error('Invalid hero name'), {
        code: problem === 'chars' ? 'username_chars' : 'username_invalid',
      });
    }
    const { data: available } = await supabase.rpc('username_available', { p_username: name });
    if (available === false) {
      throw Object.assign(new Error('Hero name taken'), { code: 'username_taken' });
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username: name },
      },
    });
    if (error) throw error;
  } finally {
    authStore$.isLoading.set(false);
  }
}

export async function signIn(email: string, password: string) {
  authStore$.isLoading.set(true);
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } finally {
    authStore$.isLoading.set(false);
  }
}

/** Public page that receives the reset link (web, also used from the mobile app). */
export const RESET_PASSWORD_URL = 'https://habitquest.expo.app/reset-password';

/** On the web, stay on the current site (preview deployments included). */
function resetPasswordUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.origin}/reset-password`;
  }
  return RESET_PASSWORD_URL;
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: resetPasswordUrl(),
  });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  // Stop pushes to this device while the session can still authorize the call.
  try {
    await supabase.rpc('unregister_push_token');
  } catch {
    // Offline: the token is reassigned on the next sign-in on this device.
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/**
 * Permanently deletes the signed-in user's account and all their data
 * (Edge Function `delete-account`), then clears the local session.
 */
export async function deleteAccount() {
  authStore$.isLoading.set(true);
  try {
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    if (error) throw error;
    // The server-side user is gone; only the local session needs clearing.
    await supabase.auth.signOut({ scope: 'local' });
  } finally {
    authStore$.isLoading.set(false);
  }
}

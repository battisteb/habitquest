import { observable } from '@legendapp/state';
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

export async function signUp(email: string, password: string, username: string) {
  authStore$.isLoading.set(true);
  try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { username },
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

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

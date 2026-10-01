import { supabase } from '../../../lib/supabase/client';
import type { Lang } from '../../../lib/i18n';
import { authStore$ } from '../stores/auth-store';

/**
 * Server texts follow the player's language: notifications read it on the
 * profile (localize_notification trigger), auth e-mails (password reset,
 * e-mail change) read it in the account metadata. Best effort: both keep
 * their previous value if this fails.
 */
export async function syncLanguage(userId: string, lang: Lang): Promise<void> {
  try {
    await supabase.from('profiles').update({ language: lang }).eq('id', userId);
    if (authStore$.user.get()?.user_metadata?.language !== lang) {
      await supabase.auth.updateUser({ data: { language: lang } });
    }
  } catch {
    // Offline: retried on the next launch or language change.
  }
}

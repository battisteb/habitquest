import { supabase } from '../../../lib/supabase/client';
import type { Lang } from '../../../lib/i18n';

/**
 * Notifications written by the server are translated for the player's
 * language (localize_notification trigger), so the profile needs it.
 * Best effort: the profile keeps its previous value if this fails.
 */
export async function syncLanguage(userId: string, lang: Lang): Promise<void> {
  try {
    await supabase.from('profiles').update({ language: lang }).eq('id', userId);
  } catch {
    // Offline: retried on the next launch or language change.
  }
}

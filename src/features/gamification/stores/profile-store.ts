import { observable } from '@legendapp/state';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { getLevelForXp } from '../../../lib/constants/game-config';
import type { Database } from '../../../lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
}

export const profileStore$ = observable<ProfileState>({
  profile: null,
  isLoading: false,
});

export async function fetchProfile(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  profileStore$.isLoading.set(true);
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  profileStore$.isLoading.set(false);

  if (data) {
    profileStore$.profile.set(data);
  }
}

/** Refresh profile after XP/gold changes */
export function refreshProfile(): void {
  fetchProfile().catch(() => {});
}

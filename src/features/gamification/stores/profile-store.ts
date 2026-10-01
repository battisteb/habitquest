import { observable } from '@legendapp/state';
import { syncObservable } from '@legendapp/state/sync';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { persistPlugin } from '../../../lib/storage/persist';
import type { Database } from '../../../lib/supabase/types';
import { resetOnSignOut } from '../../../lib/storage/user-data';
import { subscriptionStore$ } from '../../monetization/stores/subscription-store';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileState {
  profile: Profile | null;
  isLoading: boolean;
}

const initialState = (): ProfileState => ({
  profile: null,
  isLoading: false,
});

export const profileStore$ = observable<ProfileState>(initialState());

resetOnSignOut(profileStore$, initialState);

syncObservable(profileStore$, {
  persist: {
    name: 'habitquest_profile',
    plugin: persistPlugin,
  },
});

export async function fetchProfile(): Promise<void> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return;

  profileStore$.isLoading.set(true);
  // Private fields (time zone, subscription, tokens…) are only readable through this RPC.
  const { data } = await supabase.rpc('get_my_profile').maybeSingle();
  profileStore$.isLoading.set(false);

  if (data) {
    profileStore$.profile.set(data);
    // The server status (RevenueCat webhook) counts too: on the web there is
    // no RevenueCat SDK, so it is the only source for paying players there.
    if (isServerPremium(data)) subscriptionStore$.isPremium.set(true);
  }
}

export function isServerPremium(p: Pick<Profile, 'subscription_status' | 'subscription_expires_at'>): boolean {
  return (
    p.subscription_status === 'premium' &&
    (p.subscription_expires_at === null || new Date(p.subscription_expires_at).getTime() > Date.now())
  );
}

/** Refresh profile after XP/gold changes */
export function refreshProfile(): void {
  fetchProfile().catch(() => {});
}

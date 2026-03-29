import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { authStore$ } from '../../auth/stores/auth-store';
import { getXpForNextLevel } from '../../../lib/constants/game-config';
import type { Database } from '../../../lib/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileStats {
  profile: Profile | null;
  xpForNextLevel: number;
  xpProgress: number;
  isLoading: boolean;
}

export function useProfileStats(): ProfileStats {
  const [state, setState] = useState<ProfileStats>({
    profile: null,
    xpForNextLevel: 100,
    xpProgress: 0,
    isLoading: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;

    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();

    if (data) {
      const nextLevelXp = getXpForNextLevel(data.level);
      const currentLevelXp =
        data.level > 0
          ? getXpForNextLevel(data.level - 1)
          : 0;
      const xpInLevel = data.xp - currentLevelXp;
      const xpNeeded = nextLevelXp - currentLevelXp;
      const progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 0;

      setState({
        profile: data,
        xpForNextLevel: nextLevelXp,
        xpProgress: progress,
        isLoading: false,
      });
    } else {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }

  return state;
}

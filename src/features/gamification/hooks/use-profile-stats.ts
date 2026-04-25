import { useEffect, useMemo } from 'react';
import { use$ } from '@legendapp/state/react';
import { profileStore$, fetchProfile } from '../stores/profile-store';
import { getLevelForXp, getXpForNextLevel } from '../../../lib/constants/game-config';

export function useProfileStats() {
  const profile = use$(profileStore$.profile);
  const isLoading = use$(profileStore$.isLoading);

  useEffect(() => {
    fetchProfile();
  }, []);

  const derived = useMemo(() => {
    if (!profile) return { xpForNextLevel: 100, xpProgress: 0 };
    const level = getLevelForXp(profile.xp);
    const nextLevelXp = getXpForNextLevel(level);
    const currentLevelXp = level > 0 ? getXpForNextLevel(level - 1) : 0;
    const xpInLevel = profile.xp - currentLevelXp;
    const xpNeeded = nextLevelXp - currentLevelXp;
    const progress = xpNeeded > 0 ? Math.min(xpInLevel / xpNeeded, 1) : 0;
    return { xpForNextLevel: nextLevelXp, xpProgress: progress };
  }, [profile]);

  // Derive level from XP client-side so it's never stale vs the DB level column
  const profileWithLevel = useMemo(() => {
    if (!profile) return null;
    return { ...profile, level: getLevelForXp(profile.xp) };
  }, [profile]);

  return {
    profile: profileWithLevel,
    xpForNextLevel: derived.xpForNextLevel,
    xpProgress: derived.xpProgress,
    isLoading,
  };
}

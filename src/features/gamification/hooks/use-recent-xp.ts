import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase/client';
import { PACE_DAYS } from '../utils/rank-projection';

/** XP earned from quests over the last PACE_DAYS days (null while loading). */
export function useRecentXp(refreshKey?: unknown): number | null {
  const [xp, setXp] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const since = new Date(Date.now() - PACE_DAYS * 24 * 3_600_000).toISOString();
    supabase
      .from('completions')
      .select('xp_earned')
      .gte('completed_at', since)
      .then(({ data }) => {
        if (alive) setXp((data ?? []).reduce((sum, c) => sum + (c.xp_earned ?? 0), 0));
      });
    return () => {
      alive = false;
    };
  }, [refreshKey]);
  return xp;
}

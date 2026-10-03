import { supabase } from '../../lib/supabase/client';
import type { Season } from '../../lib/constants/game-config';

/** Shape of public.get_arc_state() (supabase/migrations/20261003140000_seasonal_arcs.sql). */
export interface ArcWeek {
  week_start: string;
  done?: number;
  planned?: number;
  good?: boolean;
  current?: boolean;
  future?: boolean;
}

export interface ArcState {
  season: Season;
  arc_year: number;
  starts_on: string;
  ends_on: string;
  weeks: ArcWeek[];
  total_weeks: number;
  good_weeks: number;
  target: number;
  rune_earned: boolean;
  /** The rune was earned by this very call (celebrate it once). */
  rune_new: boolean;
  runes: { season: Season; arc_year: number }[];
  /** 'premium_week' or 'gold' when the four seasons were just completed. */
  four_seasons_reward: 'premium_week' | 'gold' | null;
  four_seasons_done: boolean;
}

export async function fetchArcState(): Promise<ArcState> {
  const { data, error } = await supabase.rpc('get_arc_state' as never);
  if (error) throw error;
  return data as unknown as ArcState;
}

/** Seasons the player has a rune of (any year). */
export function collectedSeasons(state: Pick<ArcState, 'runes'>): Set<Season> {
  return new Set(state.runes.map((r) => r.season));
}

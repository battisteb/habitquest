import { ARENA, type ArenaLeague } from '../../../lib/constants/game-config';

export const LEAGUE_COLORS: Record<ArenaLeague, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#f5c518',
  platinum: '#4ecca3',
  diamond: '#6ec6ff',
  master: '#b36bff',
};

/** Tier 1..6 from the server, clamped so a bad value never crashes the screen. */
export function leagueForTier(tier: number): ArenaLeague {
  const index = Math.min(Math.max(Math.round(tier), 1), ARENA.LEAGUES.length) - 1;
  return ARENA.LEAGUES[index];
}

export type ArenaZone = 'promotion' | 'relegation' | 'safe';

/** Top 3 go up, bottom 3 go down — except where there is no league above or below. */
export function zoneForPlace(place: number, tier: number): ArenaZone {
  if (place <= ARENA.PROMOTED && tier < ARENA.LEAGUES.length) return 'promotion';
  if (place > ARENA.GROUP_SIZE - ARENA.RELEGATED && tier > 1) return 'relegation';
  return 'safe';
}

/** Days left including today (day is 0-based). */
export function daysLeft(day: number): number {
  return Math.max(ARENA.SEASON_DAYS - day, 1);
}

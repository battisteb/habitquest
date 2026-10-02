/** Shape of public.arena_state() (supabase/migrations/20260930100000_arena_leagues.sql). */
export interface ArenaStanding {
  place: number;
  username: string;
  is_bot: boolean;
  is_me: boolean;
  level: number;
  points: number;
  wins: number;
  fights: number;
}

export interface ArenaFight {
  season_day: number;
  role: 'attack' | 'defense';
  opponent: string;
  opponent_is_bot: boolean;
  won: boolean;
  points: number;
  gold: number;
  attack_power: number;
  defense_power: number;
}

export interface ArenaSeasonResult {
  season: number;
  place: number;
  from_tier: number;
  to_tier: number;
}

/** Returned instead of the state while the arena is locked (I6). */
export interface ArenaLocked {
  locked: true;
  unlock_level: number;
}

export interface ArenaState {
  season: number;
  /** 1 (Bronze) to 6 (Master). */
  tier: number;
  /** 0 to 9. */
  day: number;
  season_ends_on: string;
  last_result: ArenaSeasonResult | null;
  standings: ArenaStanding[];
  today: {
    my_habits: number;
    attack_power: number;
    opponent: {
      username: string;
      is_bot: boolean;
      level: number;
      streak: number;
      defense_power: number;
    };
    attacker: { username: string; is_bot: boolean };
  };
  recent: ArenaFight[];
}

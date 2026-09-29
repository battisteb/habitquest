import type { CoopGoal } from '../../lib/constants/game-config';

/** Shape of public.get_coop_challenges() (supabase/migrations/20260930110000_coop_challenges.sql). */
export interface CoopMember {
  username: string;
  status: 'invited' | 'accepted';
  validations: number;
  xp: number;
  reward_xp: number | null;
  is_me: boolean;
}

export interface CoopChallenge {
  id: string;
  goal: CoopGoal;
  target: number;
  duration_days: number;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  starts_at: string | null;
  ends_at: string | null;
  is_creator: boolean;
  my_status: 'invited' | 'accepted';
  slots_left: number;
  members: CoopMember[];
}

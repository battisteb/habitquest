import { RANKS } from '../../../lib/constants/game-config';

export interface AvatarStage {
  minLevel: number;
  emoji: string;
  title: string;
  aura: string;
  description: string;
}

const STAGE_LOOK: Record<string, { emoji: string; description: string }> = {
  Novice: { emoji: '🧙', description: 'Your journey begins.' },
  Apprentice: { emoji: '🗡️', description: 'You are learning fast.' },
  Warrior: { emoji: '⚔️', description: "You've proven your worth." },
  Knight: { emoji: '🛡️', description: 'Discipline is your armour.' },
  Champion: { emoji: '🦅', description: 'An inspiration to others.' },
  Legend: { emoji: '👑', description: 'Your legacy is eternal.' },
};

/**
 * The avatar evolves with the player's rank: same names and levels as RANKS
 * (game-config.ts), so the profile and the XP journey never disagree.
 */
export const AVATAR_STAGES: AvatarStage[] = RANKS.map((rank) => ({
  minLevel: rank.minLevel,
  title: rank.name,
  aura: rank.color,
  ...STAGE_LOOK[rank.name],
}));

export function getAvatarStage(level: number): AvatarStage {
  let stage = AVATAR_STAGES[0];
  for (const s of AVATAR_STAGES) {
    if (level >= s.minLevel) stage = s;
  }
  return stage;
}

export function getNextAvatarStage(level: number): AvatarStage | null {
  for (const s of AVATAR_STAGES) {
    if (s.minLevel > level) return s;
  }
  return null;
}

/** Index of the stage (0 = Novice … 5 = Legend), used for visual effects. */
export function getAvatarStageIndex(level: number): number {
  return AVATAR_STAGES.indexOf(getAvatarStage(level));
}

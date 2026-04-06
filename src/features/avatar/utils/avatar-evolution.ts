export interface AvatarStage {
  minLevel: number;
  emoji: string;
  title: string;
  aura: string;
  description: string;
}

export const AVATAR_STAGES: AvatarStage[] = [
  { minLevel: 1,  emoji: '🧙', title: 'Apprentice', aura: '#555580', description: 'Your journey begins.' },
  { minLevel: 5,  emoji: '⚔️', title: 'Warrior',    aura: '#4CAF50', description: "You've proven your worth." },
  { minLevel: 10, emoji: '🛡️', title: 'Knight',     aura: '#6C63FF', description: 'Discipline is your armour.' },
  { minLevel: 15, emoji: '🔮', title: 'Mage',        aura: '#9C27B0', description: 'Mastery over yourself.' },
  { minLevel: 20, emoji: '🦅', title: 'Champion',    aura: '#FF6B35', description: 'An inspiration to others.' },
  { minLevel: 30, emoji: '👑', title: 'Legend',      aura: '#FFD700', description: 'Your legacy is eternal.' },
];

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

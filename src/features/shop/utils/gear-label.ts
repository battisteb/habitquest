import type { GearStat, GearStats } from '../../../lib/constants/game-config';

type GearTexts = { gear_attack: string; gear_defense: string; gear_hp: string };

const ICON: Record<GearStat, string> = { attack: '⚔️', defense: '🛡️', hp: '❤️' };

function statName(T: GearTexts, stat: GearStat): string {
  return stat === 'attack' ? T.gear_attack : stat === 'defense' ? T.gear_defense : T.gear_hp;
}

/** "⚔️ +3 ATK" for one item. */
export function gearBonusLabel(T: GearTexts, bonus: { stat: GearStat; points: number }): string {
  return `${ICON[bonus.stat]} +${bonus.points} ${statName(T, bonus.stat)}`;
}

/** "⚔️ +3 · ❤️ +5" for a whole equipment (empty when it gives nothing). */
export function gearStatsLabel(stats: GearStats): string {
  return (['attack', 'defense', 'hp'] as const)
    .filter((s) => stats[s] > 0)
    .map((s) => `${ICON[s]} +${stats[s]}`)
    .join(' · ');
}

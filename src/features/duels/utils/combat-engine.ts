import { Attack } from './attacks';

export interface CombatResult {
  hit: boolean;
  damage: number;
  effect: string;
  shieldApplied?: boolean;
  healAmount?: number;
}

/**
 * Resolve a single attack.
 * levelAdvantage = attacker.level - defender.level (can be negative)
 * Positive = attacker is stronger → better odds.
 */
export function resolveAttack(attack: Attack, levelAdvantage: number): CombatResult {
  const hitAdjust = Math.max(-0.20, Math.min(0.20, levelAdvantage * 0.015));
  const finalHitChance = Math.max(0.10, Math.min(0.99, attack.hitChance + hitAdjust));

  const hit = Math.random() < finalHitChance;
  if (!hit) {
    return { hit: false, damage: 0, effect: `${attack.name} missed!` };
  }

  const damageMultiplier = Math.max(-0.25, Math.min(0.40, levelAdvantage * 0.02));
  const variance = (Math.random() * 0.6 - 0.3);
  const damage = Math.round(attack.baseDamage * (1 + variance + damageMultiplier));

  let effect = `${attack.name} hits for ${damage} damage!`;
  let shieldApplied = false;
  let healAmount = 0;

  if (attack.special === 'shield') {
    shieldApplied = true;
    effect += ' Shield activated — next hit blocked!';
  } else if (attack.special === 'heal') {
    healAmount = Math.round(damage * 0.8);
    effect += ` Recovered ${healAmount} HP!`;
  } else if (attack.special === 'double' && Math.random() < 0.3) {
    const bonus = Math.round(damage * 0.5);
    effect += ` Rally bonus! +${bonus} extra damage!`;
    return { hit: true, damage: damage + bonus, effect, shieldApplied, healAmount };
  }

  return { hit, damage, effect, shieldApplied, healAmount };
}

export interface PlayerState {
  id: string;
  name: string;
  level: number;
  hp: number;
  shield: boolean;
}

export interface RoundResult {
  attackerId: string;
  attackName: string;
  result: CombatResult;
  hpAfter: { [playerId: string]: number };
}

/**
 * Simulate a full duel given attack choices for both players.
 * Returns the sequence of rounds and the winner id (or null for draw).
 */
export function simulateDuel(
  p1: PlayerState,
  p2: PlayerState,
  p1Attack: Attack,
  p2Attack: Attack,
): { rounds: RoundResult[]; winnerId: string | null; loserXpBonus: number } {
  const state: { [id: string]: PlayerState } = {
    [p1.id]: { ...p1 },
    [p2.id]: { ...p2 },
  };
  const rounds: RoundResult[] = [];

  const order =
    p1.level >= p2.level
      ? [
          { attacker: p1, attack: p1Attack, defender: p2 },
          { attacker: p2, attack: p2Attack, defender: p1 },
        ]
      : [
          { attacker: p2, attack: p2Attack, defender: p1 },
          { attacker: p1, attack: p1Attack, defender: p2 },
        ];

  for (const { attacker, attack, defender } of order) {
    if (state[defender.id].hp <= 0) break;

    const levelAdvantage = attacker.level - defender.level;
    const result = resolveAttack(attack, levelAdvantage);

    if (result.hit) {
      if (state[defender.id].shield) {
        state[defender.id].shield = false;
        result.damage = 0;
        result.effect += ' (blocked by shield!)';
      } else {
        state[defender.id].hp = Math.max(0, state[defender.id].hp - result.damage);
      }
    }

    if (result.shieldApplied) state[attacker.id].shield = true;
    if (result.healAmount) {
      state[attacker.id].hp = Math.min(100, state[attacker.id].hp + result.healAmount);
    }

    rounds.push({
      attackerId: attacker.id,
      attackName: attack.name,
      result,
      hpAfter: {
        [p1.id]: state[p1.id].hp,
        [p2.id]: state[p2.id].hp,
      },
    });
  }

  const p1hp = state[p1.id].hp;
  const p2hp = state[p2.id].hp;
  let winnerId: string | null = null;
  if (p1hp > p2hp) winnerId = p1.id;
  else if (p2hp > p1hp) winnerId = p2.id;

  const loserLevelDiff = Math.abs(p1.level - p2.level);
  const loserXpBonus = 20 + loserLevelDiff * 5;

  return { rounds, winnerId, loserXpBonus };
}

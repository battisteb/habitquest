import { observable } from '@legendapp/state';

/**
 * Game events the hero reacts to (Battiste, 2026-10-14): a quest done, a hit on the weekly boss,
 * the boss defeated. Animated heroes listening to it play the matching sequence (hero-animation).
 */
export type HeroReaction = 'cheer' | 'strike' | 'victory';

const PRIORITY: Record<HeroReaction, number> = { cheer: 1, strike: 2, victory: 3 };
// Long enough for any sequence: a weaker event in that window does not cut a stronger one.
const HOLD_MS = 2000;

export const heroReaction$ = observable({
  reaction: null as HeroReaction | null,
  /** Increases at each event, so the same reaction twice plays twice. */
  id: 0,
  at: 0,
  /** A weekly boss is on screen and still alive: a validated quest hits it (BossCard sets it). */
  bossActive: false,
});

export function playHeroReaction(reaction: HeroReaction, now = Date.now()) {
  const current = heroReaction$.reaction.get();
  if (current && now - heroReaction$.at.get() < HOLD_MS && PRIORITY[current] > PRIORITY[reaction]) return;
  heroReaction$.assign({ reaction, id: heroReaction$.id.get() + 1, at: now });
}

/** A quest was validated: the hero hits the boss if one is there, else cheers. */
export function heroQuestDone() {
  playHeroReaction(heroReaction$.bossActive.get() ? 'strike' : 'cheer');
}

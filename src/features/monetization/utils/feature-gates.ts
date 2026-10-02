/**
 * Feature gates — single source of truth for free vs premium restrictions.
 * All limit constants are here. UI calls these functions and shows the paywall
 * when a gate returns false.
 */

import { premium$ } from '../stores/premium';

// ─── Limits ───────────────────────────────────────────────────────────────────

export const LIMITS = {
  /** Max streak freeze tokens a free user can hold at once */
  FREE_MAX_FREEZE_TOKENS: 1,
  PREMIUM_MAX_FREEZE_TOKENS: 3,

  /** Gold cost of one freeze token for free users (full price) */
  FREE_FREEZE_GOLD_COST: 100,
  /** Gold cost of one freeze token for premium users (half price) */
  PREMIUM_FREEZE_GOLD_COST: 50,

  /** Co-op challenges a player can take part in at once. Mirrored in public.coop_slots_left. */
  FREE_COOP_ACTIVE: 1,
  PREMIUM_COOP_ACTIVE: 2,

  /** How many days of stats history free users can see */
  FREE_STATS_DAYS: 30,
  // Premium: no limit (pass Infinity or 0 as "no limit")

  /** Shop item rarity cutoff for free users */
  FREE_MAX_RARITY: 'rare' as const, // free can see common + uncommon + rare
  // Premium: epic + legendary unlocked
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isPremium(): boolean {
  return premium$.get();
}

// ─── Freeze gates ─────────────────────────────────────────────────────────────

export function getMaxFreezeTokens(): number {
  return isPremium()
    ? LIMITS.PREMIUM_MAX_FREEZE_TOKENS
    : LIMITS.FREE_MAX_FREEZE_TOKENS;
}

export function getFreezeCost(): number {
  return isPremium()
    ? LIMITS.PREMIUM_FREEZE_GOLD_COST
    : LIMITS.FREE_FREEZE_GOLD_COST;
}

/** Returns true if the user can purchase/use another freeze token */
export function canUseFreeze(currentTokens: number): boolean {
  return currentTokens < getMaxFreezeTokens();
}

// ─── Stats gates ──────────────────────────────────────────────────────────────

/** Returns the max days of history to show, or null for unlimited */
export function getStatsHistoryDays(): number | null {
  return isPremium() ? null : LIMITS.FREE_STATS_DAYS;
}

export function canViewFullHistory(): boolean {
  return isPremium();
}

// ─── Shop gates ───────────────────────────────────────────────────────────────

const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

export function canViewShopItem(rarity: string): boolean {
  if (isPremium()) return true;
  const freeIdx = RARITY_ORDER.indexOf(LIMITS.FREE_MAX_RARITY);
  const itemIdx = RARITY_ORDER.indexOf(rarity);
  return itemIdx <= freeIdx;
}

export function isExclusivePremiumItem(rarity: string): boolean {
  return !canViewShopItem(rarity);
}

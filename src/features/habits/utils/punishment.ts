/**
 * Punishment system: when a streak breaks, the user loses some XP and gold
 * proportional to the streak they lost.
 */

export const PUNISHMENT_CONFIG = {
  /** XP lost per day of streak broken */
  XP_LOSS_PER_STREAK_DAY: 2,
  /** Gold lost per day of streak broken */
  GOLD_LOSS_PER_STREAK_DAY: 1,
  /** Maximum XP that can be lost at once */
  MAX_XP_LOSS: 100,
  /** Maximum gold that can be lost at once */
  MAX_GOLD_LOSS: 50,
} as const;

export function calculatePunishment(brokenStreakCount: number): {
  xpLoss: number;
  goldLoss: number;
} {
  const xpLoss = Math.min(
    brokenStreakCount * PUNISHMENT_CONFIG.XP_LOSS_PER_STREAK_DAY,
    PUNISHMENT_CONFIG.MAX_XP_LOSS,
  );
  const goldLoss = Math.min(
    brokenStreakCount * PUNISHMENT_CONFIG.GOLD_LOSS_PER_STREAK_DAY,
    PUNISHMENT_CONFIG.MAX_GOLD_LOSS,
  );
  return { xpLoss, goldLoss };
}

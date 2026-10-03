import { storage } from '../../../lib/storage/mmkv';

/**
 * The 14-day free trial of Premium (decided by Battiste, 2026-10-02).
 *
 * The trial itself is an introductory offer of the App Store / Play Store
 * subscription: the store charges nothing for 14 days, then starts the
 * subscription unless the player cancels. This file only decides when to
 * offer it, so it is offered without nagging:
 * - once, right after the tutorial (the full Premium screen);
 * - then as a small reminder, never in the first 24 hours, at most once every
 *   3 days, and never again after 3 "Later";
 * - once more when a quest first reaches 21 days in a row (G5): the player
 *   just proved they stick to it, the best moment to offer more.
 */

export const TRIAL_DAYS = 14;
const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_FIRST_DELAY = DAY;
export const REMINDER_INTERVAL = 3 * DAY;
export const MAX_REFUSALS = 3;
/** The player is told this many days before the trial ends. */
export const TRIAL_END_NOTICE_DAYS = 2;
/** The streak that brings the one-time offer (the "Adept" identity, G3). */
export const STREAK_OFFER_DAYS = 21;

export interface TrialOfferState {
  /** When this device first saw the app (ms). */
  firstSeenAt: number;
  /** When the offer or a reminder was last shown (ms), 0 if never. */
  lastShownAt: number;
  /** Times the player answered "Later" or closed the offer. */
  refusals: number;
  /** Whether the post-tutorial offer was shown. */
  introShown: boolean;
  /** Whether the 21-day streak offer was shown (G5). */
  streakOfferShown?: boolean;
}

export interface TrialContext {
  /** The store offers the trial to this player (never on the web). */
  eligible: boolean;
  isPremium: boolean;
}

const KEY = 'trial-offer-v1';

export function loadTrialOfferState(now = Date.now()): TrialOfferState {
  try {
    const raw = storage.getString(KEY);
    if (raw) return { firstSeenAt: now, lastShownAt: 0, refusals: 0, introShown: false, ...JSON.parse(raw) };
  } catch {
    // Corrupted value: start over.
  }
  const state = { firstSeenAt: now, lastShownAt: 0, refusals: 0, introShown: false };
  storage.set(KEY, JSON.stringify(state));
  return state;
}

function save(state: TrialOfferState): void {
  storage.set(KEY, JSON.stringify(state));
}

/** Right after the tutorial: the full offer, once. */
export function shouldOfferTrialAfterTutorial(state: TrialOfferState, ctx: TrialContext): boolean {
  return ctx.eligible && !ctx.isPremium && !state.introShown;
}

/** Later on: a reminder, spaced out and limited. */
export function shouldRemindTrial(state: TrialOfferState, ctx: TrialContext, now = Date.now()): boolean {
  return (
    ctx.eligible &&
    !ctx.isPremium &&
    state.refusals < MAX_REFUSALS &&
    now - state.firstSeenAt >= REMINDER_FIRST_DELAY &&
    now - state.lastShownAt >= REMINDER_INTERVAL
  );
}

/** A quest just reached 21 days in a row for the first time: offer once (G5). */
export function shouldOfferTrialAtStreak(state: TrialOfferState, ctx: TrialContext, streak: number): boolean {
  return ctx.eligible && !ctx.isPremium && !state.streakOfferShown && streak === STREAK_OFFER_DAYS;
}

export function recordStreakOfferShown(now = Date.now()): void {
  const state = loadTrialOfferState(now);
  save({ ...state, lastShownAt: now, streakOfferShown: true });
}

export function recordTrialOfferShown(intro: boolean, now = Date.now()): void {
  const state = loadTrialOfferState(now);
  save({ ...state, lastShownAt: now, introShown: state.introShown || intro });
}

export function recordTrialOfferRefused(now = Date.now()): void {
  const state = loadTrialOfferState(now);
  save({ ...state, refusals: state.refusals + 1 });
}

/** Whole days left before the trial ends (0 on the last day). */
export function trialDaysLeft(endsAt: string | null, now = Date.now()): number | null {
  if (!endsAt) return null;
  const end = new Date(endsAt).getTime();
  if (Number.isNaN(end) || end <= now) return null;
  return Math.floor((end - now) / DAY);
}

/** When to warn the player that the trial is ending (null if already past). */
export function trialEndNoticeAt(endsAt: string | null, now = Date.now()): Date | null {
  if (!endsAt) return null;
  const at = new Date(endsAt).getTime() - TRIAL_END_NOTICE_DAYS * DAY;
  return Number.isNaN(at) || at <= now ? null : new Date(at);
}

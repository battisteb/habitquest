/**
 * Ad limits (D9): no full-screen ad during a new player's first week, and
 * none before a duel.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));

import { inInterstitialGracePeriod } from '../utils/ad-service';
import { ADS } from '../../../lib/constants/game-config';

const DAY = 24 * 60 * 60 * 1000;
const now = new Date('2026-10-10T12:00:00Z');
const daysAgo = (d: number) => new Date(now.getTime() - d * DAY).toISOString();

describe('interstitial grace period', () => {
  it('lasts a week', () => {
    expect(ADS.interstitialGraceDays).toBe(7);
  });

  it('covers a new account', () => {
    expect(inInterstitialGracePeriod(daysAgo(0), now)).toBe(true);
    expect(inInterstitialGracePeriod(daysAgo(6.9), now)).toBe(true);
  });

  it('ends after 7 days', () => {
    expect(inInterstitialGracePeriod(daysAgo(7), now)).toBe(false);
    expect(inInterstitialGracePeriod(daysAgo(30), now)).toBe(false);
  });

  it('plays safe when the account date is unknown', () => {
    expect(inInterstitialGracePeriod(undefined, now)).toBe(true);
    expect(inInterstitialGracePeriod(null, now)).toBe(true);
    expect(inInterstitialGracePeriod('not a date', now)).toBe(true);
  });
});

describe('duels', () => {
  it('never show a full-screen ad first', () => {
    const src = readFileSync(join(__dirname, '../../../../app/duels/index.tsx'), 'utf8');
    expect(src).not.toMatch(/showInterstitial/);
  });
});

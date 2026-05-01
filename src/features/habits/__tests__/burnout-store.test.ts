jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

import {
  burnoutStore$,
  dismissBurnoutBanner,
  recordBreakTaken,
  isDismissalActive,
  BURNOUT_DISMISS_COOLDOWN_DAYS,
} from '../stores/burnout-store';

describe('burnout-store', () => {
  beforeEach(() => {
    burnoutStore$.lastDismissedAt.set(null);
    burnoutStore$.lastBreakTakenAt.set(null);
  });

  it('isDismissalActive returns false when never dismissed', () => {
    expect(isDismissalActive()).toBe(false);
  });

  it('dismissBurnoutBanner sets timestamp and activates dismissal', () => {
    dismissBurnoutBanner();
    expect(burnoutStore$.lastDismissedAt.get()).not.toBeNull();
    expect(isDismissalActive()).toBe(true);
  });

  it('isDismissalActive returns false after cooldown expires', () => {
    const past = new Date();
    past.setDate(past.getDate() - (BURNOUT_DISMISS_COOLDOWN_DAYS + 1));
    burnoutStore$.lastDismissedAt.set(past.toISOString());
    expect(isDismissalActive()).toBe(false);
  });

  it('isDismissalActive returns true within cooldown window', () => {
    const recent = new Date();
    recent.setHours(recent.getHours() - 12); // 12h ago
    burnoutStore$.lastDismissedAt.set(recent.toISOString());
    expect(isDismissalActive()).toBe(true);
  });

  it('recordBreakTaken sets both timestamps', () => {
    recordBreakTaken();
    expect(burnoutStore$.lastBreakTakenAt.get()).not.toBeNull();
    expect(burnoutStore$.lastDismissedAt.get()).not.toBeNull();
    expect(isDismissalActive()).toBe(true);
  });
});

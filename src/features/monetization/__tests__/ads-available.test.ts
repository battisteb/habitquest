/**
 * Platforms without ads (web, iOS 1.0 without AdMob units) must not advertise
 * "no ads" as a Premium perk (App Review guideline 2.3).
 */
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));

function adsAvailableOn(os: 'ios' | 'android' | 'web', dev: boolean) {
  const g = global as unknown as { __DEV__: boolean };
  const previous = g.__DEV__;
  g.__DEV__ = dev;
  let mod: typeof import('../utils/ad-service') | undefined;
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({
      Platform: { OS: os, select: (o: Record<string, unknown>) => o[os] ?? o.default },
    }));
    jest.doMock('../stores/premium', () => ({ premium$: { get: () => false } }));
    jest.doMock('../../gamification/stores/profile-store', () => ({ profileStore$: {} }));
    jest.doMock('../utils/tracking-consent', () => ({ canPersonalizeAds: () => false }));
    mod = require('../utils/ad-service');
  });
  const result = mod!.adsAvailable();
  g.__DEV__ = previous;
  return result;
}

describe('adsAvailable', () => {
  it('is false on the web', () => {
    expect(adsAvailableOn('web', false)).toBe(false);
  });

  it('is true on Android release builds', () => {
    expect(adsAvailableOn('android', false)).toBe(true);
  });

  it('is false on iOS release builds while the iOS ad units are empty', () => {
    expect(adsAvailableOn('ios', false)).toBe(false);
  });
});

import { hasCompletedOnboarding, markOnboardingComplete } from '../onboarding-state';

const mockStore = new Map<string, string>();

jest.mock('../../../lib/storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStore.get(key),
    set: (key: string, value: string) => mockStore.set(key, value),
    delete: (key: string) => mockStore.delete(key),
  },
}));

describe('onboarding-state', () => {
  beforeEach(() => mockStore.clear());

  it('is not completed on a fresh install', () => {
    expect(hasCompletedOnboarding()).toBe(false);
  });

  it('is completed once marked', () => {
    markOnboardingComplete();
    expect(hasCompletedOnboarding()).toBe(true);
  });
});

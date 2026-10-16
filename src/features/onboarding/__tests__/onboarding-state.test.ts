import { hasCompletedOnboarding, markOnboardingComplete } from '../onboarding-state';

const mockStore = new Map<string, string>();

jest.mock('../../../lib/storage/mmkv', () => ({
  storage: {
    getString: (key: string) => mockStore.get(key),
    set: (key: string, value: string) => mockStore.set(key, value),
    delete: (key: string) => mockStore.delete(key),
  },
}));

const NOW = Date.parse('2026-10-16T10:00:00Z');
const newAccount = { id: 'new', created_at: '2026-10-16T09:50:00Z' };
const oldAccount = { id: 'old', created_at: '2026-10-01T09:00:00Z' };

describe('onboarding-state', () => {
  beforeEach(() => mockStore.clear());

  it('is not completed on a fresh install', () => {
    expect(hasCompletedOnboarding()).toBe(false);
    expect(hasCompletedOnboarding(newAccount, NOW)).toBe(false);
  });

  it('is completed once marked for the account', () => {
    markOnboardingComplete(newAccount.id);
    expect(hasCompletedOnboarding(newAccount, NOW)).toBe(true);
    expect(hasCompletedOnboarding()).toBe(true);
  });

  it('belongs to the account: a new account on a phone that already did it still gets it', () => {
    markOnboardingComplete('someone-else');
    expect(hasCompletedOnboarding(newAccount, NOW)).toBe(false);
  });

  it('counts as done for an account older than a day (an existing player reinstalling)', () => {
    expect(hasCompletedOnboarding(oldAccount, NOW)).toBe(true);
  });
});

/**
 * No penalty for a broken streak: a 24-hour comeback window with double XP
 * (ADR 019). The banner shows it with the hours left.
 */
import { render } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => `${String(key)} {x}{h}` });
  return { useT: () => T };
});

import { ComebackBanner, comebackHoursLeft } from '../components/comeback-banner';
import { profileStore$ } from '../../gamification/stores/profile-store';

const NOW = Date.UTC(2026, 9, 2, 12);

describe('comebackHoursLeft', () => {
  it('rounds the time left up to whole hours', () => {
    expect(comebackHoursLeft(new Date(NOW + 23.2 * 3_600_000).toISOString(), NOW)).toBe(24);
    expect(comebackHoursLeft(new Date(NOW + 60_000).toISOString(), NOW)).toBe(1);
  });

  it('is closed when the window is over or absent', () => {
    expect(comebackHoursLeft(new Date(NOW - 1).toISOString(), NOW)).toBeNull();
    expect(comebackHoursLeft(null, NOW)).toBeNull();
  });
});

describe('ComebackBanner', () => {
  it('shows during the window', () => {
    profileStore$.profile.set({ id: 'me', comeback_until: new Date(Date.now() + 5 * 3_600_000).toISOString() } as never);
    const { getByTestId, getByText } = render(<ComebackBanner />);
    expect(getByTestId('comeback-banner')).toBeTruthy();
    expect(getByText('comeback_title 2{h}')).toBeTruthy();
  });

  it('is hidden otherwise', () => {
    profileStore$.profile.set({ id: 'me', comeback_until: null } as never);
    const { queryByTestId } = render(<ComebackBanner />);
    expect(queryByTestId('comeback-banner')).toBeNull();
  });
});

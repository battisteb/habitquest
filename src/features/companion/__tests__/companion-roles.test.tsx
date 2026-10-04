/**
 * D11: Pip guides everyone; the dragon is the Premium companion. A free
 * player who taps the locked dragon learns what it is before any paywall.
 */
import { renderHook, act } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
const mockDialog = jest.fn();
jest.mock('../../../lib/app-alert', () => ({ showDialog: (...a: unknown[]) => mockDialog(...a) }));
jest.mock('../../habits/stores/habits-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { habitsStore$: observable({ habits: [{ id: 'h', is_archived: false }], streaks: {} }), fetchHabits: jest.fn() };
});

import { useCompanion } from '../hooks/use-companion';
import { premium$ } from '../../monetization/stores/premium';
import { getStrings, lang$ } from '../../../lib/i18n';

describe('the locked dragon', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lang$.set('en');
  });

  it('explains itself, then offers Premium', () => {
    premium$.set(false);
    const { result } = renderHook(() => useCompanion());
    act(() => result.current.onPress());
    expect(mockPush).not.toHaveBeenCalled();
    const [title, msg, buttons] = mockDialog.mock.calls[0];
    expect(title).toBe(getStrings().companion_locked_title);
    expect(msg).toMatch(/Pip stays your guide/);
    buttons[1].onPress();
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('and Pip introduces both roles in the tutorial', () => {
    expect(getStrings().tuto_pip_body).toMatch(/guide/);
    expect(getStrings().tuto_pip_body).toMatch(/dragon/);
    expect(getStrings().tuto_focus_body).toMatch(/Pause/);
  });
});

import { act, fireEvent, render } from '@testing-library/react-native';
import { UNLOCKS, isUnlocked, newlyUnlocked } from '../../../lib/constants/game-config';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../../lib/storage/mmkv', () => {
  const map = new Map<string, string>();
  return {
    storage: {
      getString: (k: string) => map.get(k),
      set: (k: string, v: string) => map.set(k, v),
      delete: (k: string) => map.delete(k),
      clear: () => map.clear(),
    },
  };
});
jest.mock('../../gamification/stores/profile-store', () => {
  const { observable: obs } = jest.requireActual('@legendapp/state');
  return { profileStore$: obs({ profile: null }) };
});
jest.mock('../../auth/stores/auth-store', () => {
  const { observable: obs } = jest.requireActual('@legendapp/state');
  return { authStore$: obs({ user: { id: 'me' } }) };
});
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));

import { UnlockAnnouncer } from '../components/unlock-announcer';

const { storage: mockStorage } = jest.requireMock('../../../lib/storage/mmkv');
const { profileStore$: mockProfile$ } = jest.requireMock('../../gamification/stores/profile-store');

describe('progressive unlocks (I6)', () => {
  it('opens the arena at 3, duels and co-op at 5', () => {
    expect(UNLOCKS).toEqual({ arena: 3, duels: 5, coop: 5 });
    expect(isUnlocked('arena', 2)).toBe(false);
    expect(isUnlocked('arena', 3)).toBe(true);
    expect(isUnlocked('duels', 4)).toBe(false);
  });

  it('lists what a level-up opens', () => {
    expect(newlyUnlocked(2, 3)).toEqual(['arena']);
    expect(newlyUnlocked(4, 5)).toEqual(['duels', 'coop']);
    expect(newlyUnlocked(1, 6)).toEqual(['arena', 'duels', 'coop']);
    expect(newlyUnlocked(5, 6)).toEqual([]);
  });

  describe('Pip announces it', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockStorage.clear();
      mockPush.mockClear();
      act(() => mockProfile$.profile.set(null));
    });
    afterEach(() => jest.useRealTimers());

    it('stays quiet on the first launch, then announces a new unlock', () => {
      const utils = render(<UnlockAnnouncer />);
      act(() => mockProfile$.profile.set({ level: 2 }));
      act(() => jest.advanceTimersByTime(4000));
      expect(utils.queryByTestId('unlock-title')).toBeNull();

      act(() => mockProfile$.profile.set({ level: 3 }));
      act(() => jest.advanceTimersByTime(4000));
      expect(utils.getByText('unlock_arena_title')).toBeTruthy();
      expect(utils.getByTestId('pip')).toBeTruthy();

      fireEvent.press(utils.getByText('UNLOCK_GO'));
      expect(mockPush).toHaveBeenCalledWith('/arena');
      expect(utils.queryByTestId('unlock-title')).toBeNull();
    });

    it('announces duels then co-op one after the other', () => {
      mockStorage.set('unlock-last-level:me', '4');
      const utils = render(<UnlockAnnouncer />);
      act(() => mockProfile$.profile.set({ level: 5 }));
      act(() => jest.advanceTimersByTime(4000));
      expect(utils.getByText('unlock_duels_title')).toBeTruthy();
      fireEvent.press(utils.getByText('UNLOCK_LATER'));
      expect(utils.getByText('unlock_coop_title')).toBeTruthy();
    });
  });
});

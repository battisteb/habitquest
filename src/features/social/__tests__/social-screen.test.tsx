/**
 * Social (D1, D2): two tabs, Friends first with the search on top and each
 * friend's streak; duels with a friend open at level 5 (I6).
 */
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});
jest.mock('../../../lib/i18n/labels', () => ({ titleLabel: (_T: unknown, n: string) => n }));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../monetization/components/ad-banner', () => ({ AdBanner: () => null }));
const mockDialog = jest.fn();
jest.mock('../../../lib/app-alert', () => ({ showDialog: (...a: unknown[]) => mockDialog(...a) }));
const mockSearch = jest.fn();
const mockKudos = jest.fn();
jest.mock('../stores/friends-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const friendsStore$ = observable({
    friends: [{ id: 'f1', profile: { id: 'u2', username: 'Léa', level: 6, xp: 900, best_streak: 12 } }],
    pendingReceived: [],
    pendingSent: [],
    searchResults: [{ id: 'u3', username: 'Kenji', level: 2, xp: 120 }],
    today: { u2: { done: 2, sent: false, received: 1 } },
    isLoading: false,
  });
  return {
    friendsStore$,
    fetchFriends: jest.fn(() => Promise.resolve()),
    fetchFriendsToday: jest.fn(() => Promise.resolve()),
    giveKudos: (id: string) => mockKudos(id),
    searchUsers: (q: string) => mockSearch(q),
    sendFriendRequest: jest.fn(),
    respondToRequest: jest.fn(),
    removeFriend: jest.fn(),
  };
});
jest.mock('../hooks/use-leaderboard', () => ({
  useLeaderboard: () => ({ entries: [], isLoading: false, refresh: jest.fn(() => Promise.resolve()) }),
}));
jest.mock('../../gamification/stores/profile-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { profileStore$: observable({ profile: { level: 6 } }) };
});
jest.mock('../../auth/stores/auth-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { authStore$: observable({ user: { id: 'me' } }) };
});

import SocialScreen from '../../../../app/(tabs)/social';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { friendsStore$ } from '../stores/friends-store';

describe('Social screen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    profileStore$.profile.set({ level: 6 } as never);
    friendsStore$.today.set({ u2: { done: 2, sent: false, received: 1 } });
  });

  it('has two tabs and opens on Friends, with streaks shown', () => {
    const { getByText, queryByText } = render(<SocialScreen />);
    expect(getByText('Léa')).toBeTruthy();
    expect(getByText(/🔥 12/)).toBeTruthy();
    expect(queryByText('social_tab_duels')).toBeNull();
  });

  it('searches from the Friends tab', () => {
    const { getByTestId, getByText } = render(<SocialScreen />);
    fireEvent.changeText(getByTestId('social-search'), 'ke');
    expect(mockSearch).toHaveBeenCalledWith('ke');
    expect(getByText('Kenji')).toBeTruthy();
  });

  it('starts a duel with a friend from level 5', () => {
    const { getByTestId } = render(<SocialScreen />);
    fireEvent.press(getByTestId('friend-duel-u2'));
    expect(mockPush).toHaveBeenCalledWith('/duels/challenge?opponentId=u2');
  });

  it('cheers a friend who did a quest today (G4)', () => {
    const { getByTestId, getByText } = render(<SocialScreen />);
    expect(getByText('social_done_today')).toBeTruthy();
    expect(getByText('social_kudos_received')).toBeTruthy();
    fireEvent.press(getByTestId('friend-kudos-u2'));
    expect(mockKudos).toHaveBeenCalledWith('u2');
  });

  it('has nothing to cheer before the friend did anything', () => {
    friendsStore$.today.set({});
    const { queryByTestId } = render(<SocialScreen />);
    expect(queryByTestId('friend-kudos-u2')).toBeNull();
  });

  it('explains when duels are still locked', () => {
    profileStore$.profile.set({ level: 2 } as never);
    const { getByTestId } = render(<SocialScreen />);
    fireEvent.press(getByTestId('friend-duel-u2'));
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockDialog).toHaveBeenCalledWith('unlock_locked_title', expect.any(String));
  });
});

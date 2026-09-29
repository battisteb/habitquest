import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CoopListScreen from '../screens/coop-list-screen';
import CoopCreateScreen from '../screens/coop-create-screen';
import { fetchCoopChallenges, respondCoopChallenge, createCoopChallenge } from '../api';
import type { CoopChallenge } from '../types';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useRouter: () => ({ back: mockBack, push: mockPush, replace: jest.fn(), canGoBack: () => true }),
    useFocusEffect: (cb: () => void) => useEffect(cb, [cb]),
  };
});
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../lib/i18n', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const T = new Proxy({}, {
    get: (_t, key) => (key === 'coop_goal_validations' ? '{n} validations' : String(key)),
  });
  return { useT: () => T, lang$: observable('fr') };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('../api', () => {
  class CoopLimitError extends Error {}
  return {
    CoopLimitError,
    fetchCoopChallenges: jest.fn(),
    respondCoopChallenge: jest.fn(() => Promise.resolve()),
    cancelCoopChallenge: jest.fn(() => Promise.resolve()),
    createCoopChallenge: jest.fn(() => Promise.resolve('new-id')),
  };
});
jest.mock('../../social/stores/friends-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return {
    fetchFriends: jest.fn(),
    friendsStore$: observable({
      friends: [
        { id: 'f1', profile: { id: 'u-ana', username: 'ana' } },
        { id: 'f2', profile: { id: 'u-ben', username: 'ben' } },
      ],
    }),
  };
});

const invite: CoopChallenge = {
  id: 'c1',
  goal: 'validations',
  target: 21,
  duration_days: 7,
  status: 'active',
  progress: 8,
  starts_at: '2026-09-29T10:00:00Z',
  ends_at: '2026-10-06T10:00:00Z',
  is_creator: false,
  my_status: 'invited',
  slots_left: 1,
  members: [
    { username: 'ana', status: 'accepted', validations: 5, xp: 55, reward_xp: null, is_me: false },
    { username: 'ben', status: 'accepted', validations: 3, xp: 33, reward_xp: null, is_me: false },
    { username: 'hero', status: 'invited', validations: 0, xp: 0, reward_xp: null, is_me: true },
  ],
};

describe('CoopListScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the shared goal, the progress and each member', async () => {
    (fetchCoopChallenges as jest.Mock).mockResolvedValue([invite]);
    const utils = render(<CoopListScreen />);
    await waitFor(() => expect(utils.getByText('21 validations')).toBeTruthy());
    expect(utils.getByText('8 / 21')).toBeTruthy();
    expect(utils.getByText('5 ✓')).toBeTruthy();
    expect(utils.getByText('coop_waiting')).toBeTruthy();
  });

  it('lets an invited player join', async () => {
    (fetchCoopChallenges as jest.Mock).mockResolvedValue([invite]);
    const utils = render(<CoopListScreen />);
    await waitFor(() => expect(utils.getByText('COOP_ACCEPT')).toBeTruthy());
    fireEvent.press(utils.getByText('COOP_ACCEPT'));
    await waitFor(() => expect(respondCoopChallenge).toHaveBeenCalledWith('c1', true));
  });

  it('explains how co-op works when there is none', async () => {
    (fetchCoopChallenges as jest.Mock).mockResolvedValue([]);
    const utils = render(<CoopListScreen />);
    await waitFor(() => expect(utils.getByText('coop_empty')).toBeTruthy());
  });
});

describe('CoopCreateScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('suggests a target from the team size and sends the invitations', async () => {
    const utils = render(<CoopCreateScreen />);
    fireEvent.press(utils.getByTestId('coop-friend-ana'));
    fireEvent.press(utils.getByTestId('coop-friend-ben'));
    // 3 players x 7 days
    expect(utils.getByTestId('coop-target').props.children).toBe('21 validations');
    fireEvent.press(utils.getByTestId('coop-days-3'));
    expect(utils.getByTestId('coop-target').props.children).toBe('9 validations');
    fireEvent.press(utils.getByText('COOP_CREATE_SUBMIT'));
    await waitFor(() =>
      expect(createCoopChallenge).toHaveBeenCalledWith(['u-ana', 'u-ben'], 'validations', 9, 3),
    );
    expect(mockBack).toHaveBeenCalled();
  });

  it('needs at least one friend', () => {
    const utils = render(<CoopCreateScreen />);
    fireEvent.press(utils.getByText('COOP_CREATE_SUBMIT'));
    expect(createCoopChallenge).not.toHaveBeenCalled();
  });
});

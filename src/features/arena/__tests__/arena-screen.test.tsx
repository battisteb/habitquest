import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ArenaScreen from '../screens/arena-screen';
import { fetchArenaState, ackArenaResult } from '../api';
import type { ArenaState } from '../types';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../lib/i18n', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T, lang$: observable('fr') };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('../api', () => ({
  fetchArenaState: jest.fn(),
  ackArenaResult: jest.fn(() => Promise.resolve()),
}));

const standings = Array.from({ length: 11 }, (_, i) => ({
  place: i + 1,
  username: i === 4 ? 'hero' : `Bot${i}`,
  is_bot: i !== 4,
  is_me: i === 4,
  level: 3,
  points: 30 - i * 3,
  wins: 10 - i,
  fights: 10,
}));

const baseState: ArenaState = {
  season: 1,
  tier: 2,
  day: 3,
  season_ends_on: '2026-10-17',
  last_result: null,
  standings,
  today: {
    my_habits: 2,
    attack_power: 190,
    opponent: { username: 'Grimbold', is_bot: true, level: 4, streak: 8, defense_power: 150 },
    attacker: { username: 'rival', is_bot: false },
  },
  recent: [
    { season_day: 2, role: 'attack', opponent: 'Sylvara', opponent_is_bot: true, won: true, points: 3, gold: 10, attack_power: 220, defense_power: 150 },
    { season_day: 2, role: 'defense', opponent: 'rival', opponent_is_bot: false, won: false, points: 1, gold: 0, attack_power: 130, defense_power: 160 },
  ],
};

const mockFetch = fetchArenaState as jest.Mock;

describe('ArenaScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the league, today's fight and the standings with bots flagged", async () => {
    mockFetch.mockResolvedValue(baseState);
    const utils = render(<ArenaScreen />);
    await waitFor(() => expect(utils.getByTestId('arena-league')).toBeTruthy());
    expect(utils.getByTestId('arena-attack').props.children).toBe(190);
    expect(utils.getByTestId('arena-me')).toBeTruthy();
    expect(utils.getAllByText('arena_bot_tag')).toHaveLength(10);
    expect(utils.getByText('arena_zone_up')).toBeTruthy();
    expect(utils.getByText('arena_zone_down')).toBeTruthy();
  });

  it("reads a defence the attacker failed as a win for me", async () => {
    mockFetch.mockResolvedValue(baseState);
    const utils = render(<ArenaScreen />);
    await waitFor(() => expect(utils.getAllByText('arena_won')).toHaveLength(2));
    expect(utils.queryByText('arena_lost')).toBeNull();
  });

  it('shows the end-of-season result once and acknowledges it', async () => {
    mockFetch.mockResolvedValue({
      ...baseState,
      last_result: { season: 0, place: 1, from_tier: 1, to_tier: 2 },
    });
    const utils = render(<ArenaScreen />);
    await waitFor(() => expect(utils.getByTestId('arena-result')).toBeTruthy());
    fireEvent.press(utils.getByText('ARENA_RESULT_OK'));
    expect(ackArenaResult).toHaveBeenCalled();
    expect(utils.queryByTestId('arena-result')).toBeNull();
  });

  it('offers a retry when the arena cannot load', async () => {
    mockFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(baseState);
    const utils = render(<ArenaScreen />);
    await waitFor(() => expect(utils.getByText('arena_error')).toBeTruthy());
    fireEvent.press(utils.getByText('ARENA_RETRY'));
    await waitFor(() => expect(utils.getByTestId('arena-league')).toBeTruthy());
  });
});

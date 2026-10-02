import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditHabitScreen from '../../../../app/habit/edit/[id]';
import { updateHabit } from '../stores/habits-store';

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'h1' }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});

jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../components/content-picker', () => ({ ContentPicker: () => null }));
jest.mock('../components/emoji-picker', () => ({ EmojiPicker: () => null }));
jest.mock('../stores/habits-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return {
    habitsStore$: observable({
      habits: [{ id: 'h1', name: 'Gym', category: 'fitness', frequency: '3x_week', days: null, content: null }],
    }),
    updateHabit: jest.fn(() => Promise.resolve()),
  };
});

describe('EditHabitScreen schedule', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps an older "N times a week" quest as it is', async () => {
    const utils = render(<EditHabitScreen />);
    expect(utils.getByTestId('freq-3x_week')).toBeTruthy();
    fireEvent.press(utils.getByText('HABIT_EDIT_SAVE'));
    await waitFor(() => expect(updateHabit).toHaveBeenCalledWith('h1', expect.objectContaining({ frequency: '3x_week', days: null })));
  });

  it('moves it to chosen days', async () => {
    const utils = render(<EditHabitScreen />);
    fireEvent.press(utils.getByTestId('freq-days'));
    fireEvent.press(utils.getByTestId('day-7'));
    fireEvent.press(utils.getByText('HABIT_EDIT_SAVE'));
    await waitFor(() => expect(updateHabit).toHaveBeenCalledWith('h1', expect.objectContaining({ frequency: 'days', days: [1, 3, 5, 7] })));
  });
});

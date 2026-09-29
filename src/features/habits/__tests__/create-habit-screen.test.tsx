import { render, fireEvent, waitFor } from '@testing-library/react-native';
import CreateHabitScreen from '../../../../app/habit/create';
import { createHabit } from '../stores/habits-store';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../lib/i18n', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const T = new Proxy({}, {
    get: (_t, key) => (key === 'habit_create_times_per_week' ? '{n} fois par semaine' : String(key)),
  });
  return { useT: () => T, lang$: observable('fr') };
});

jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('../components/content-picker', () => ({ ContentPicker: () => null }));
jest.mock('../components/emoji-picker', () => ({ EmojiPicker: () => null }));
jest.mock('../stores/habits-store', () => ({ createHabit: jest.fn(() => Promise.resolve()) }));

describe('CreateHabitScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fills name, category and frequency from a one-tap idea', async () => {
    const utils = render(<CreateHabitScreen />);
    fireEvent.press(utils.getByText('Lire 20 min'));
    fireEvent.press(utils.getByText('HABIT_CREATE_SUBMIT'));
    await waitFor(() => expect(createHabit).toHaveBeenCalledWith('Lire 20 min', 'learning', null, 'daily', null));
    expect(mockBack).toHaveBeenCalled();
  });

  it('switches to N times a week with a stepper bounded to 2..5', async () => {
    const utils = render(<CreateHabitScreen />);
    fireEvent.changeText(utils.getByPlaceholderText('habit_create_name_placeholder'), 'Gym');
    fireEvent.press(utils.getByTestId('freq-weekly'));
    expect(utils.getByTestId('freq-value').props.children).toBe('3 fois par semaine');
    fireEvent.press(utils.getByLabelText('habit_create_more'));
    fireEvent.press(utils.getByLabelText('habit_create_more'));
    fireEvent.press(utils.getByLabelText('habit_create_more'));
    expect(utils.getByTestId('freq-value').props.children).toBe('5 fois par semaine');
    fireEvent.press(utils.getByText('HABIT_CREATE_SUBMIT'));
    await waitFor(() => expect(createHabit).toHaveBeenCalledWith('Gym', 'general', null, '5x_week', null));
  });

  it('keeps icon and content options folded until asked', () => {
    const utils = render(<CreateHabitScreen />);
    expect(utils.queryByText('habit_create_less_options')).toBeNull();
    fireEvent.press(utils.getByText('habit_create_more_options'));
    expect(utils.getByText('habit_create_less_options')).toBeTruthy();
  });
});

/**
 * One Pause (D3): a freeze for today, some quests, or everything; always on
 * the server, so streaks are protected.
 */
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: { rpc: jest.fn() } }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }), useLocalSearchParams: () => mockParams }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../monetization/utils/ad-service', () => ({ shouldShowAds: () => false, showRewardedInterstitial: jest.fn() }));
let mockParams: { suggest?: string } = {};
const mockPause = jest.fn((_id: string) => Promise.resolve());
const mockResume = jest.fn((_id: string) => Promise.resolve());
jest.mock('../stores/habits-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return {
    habitsStore$: observable({ habits: [], weekCompletions: {} }),
    pauseHabit: (id: string) => mockPause(id),
    resumeHabit: (id: string) => mockResume(id),
    getWeeklyTarget: () => 1,
  };
});

import PauseScreen from '../screens/pause-screen';
import { habitsStore$ } from '../stores/habits-store';
import { fullyPausedCategories, pauseSuggestions, PAUSE_PRESETS } from '../utils/pause';
import { lang$ } from '../../../lib/i18n';

const habit = (id: string, category: string, extra: object = {}) => ({
  id, name: id, category, frequency: 'daily', is_archived: false, is_paused: false, ...extra,
});

describe('pause rules', () => {
  it('suggest the two quests least done this week', () => {
    const hs = [habit('a', 'fitness'), habit('b', 'learning'), habit('c', 'health')];
    expect(pauseSuggestions(hs, { a: 1, b: 0, c: 0 }, () => 1)).toEqual(['b', 'c']);
  });

  it('pause a category\'s missions once all its quests are paused', () => {
    expect(fullyPausedCategories([
      habit('a', 'fitness', { is_paused: true }),
      habit('b', 'fitness', { is_paused: true }),
      habit('c', 'learning', { is_paused: true }),
      habit('d', 'learning'),
    ])).toEqual(['fitness']);
  });

  it('keep the exam and competition shortcuts', () => {
    expect(PAUSE_PRESETS.exam).toContain('fitness');
    expect(PAUSE_PRESETS.competition).toContain('learning');
  });
});

describe('PauseScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    lang$.set('en');
    habitsStore$.habits.set([habit('Run', 'fitness'), habit('Read', 'learning'), habit('Yoga', 'mindfulness', { is_paused: true })] as never);
  });

  it('pauses the quests picked', async () => {
    const { getByTestId } = render(<PauseScreen />);
    fireEvent.press(getByTestId('pause-pick-Run'));
    fireEvent.press(getByTestId('pause-selected'));
    await waitFor(() => expect(mockPause).toHaveBeenCalledWith('Run'));
    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it('picks by shortcut', async () => {
    const { getByTestId } = render(<PauseScreen />);
    fireEvent.press(getByTestId('pause-preset-exam'));
    fireEvent.press(getByTestId('pause-selected'));
    await waitFor(() => expect(mockPause).toHaveBeenCalledWith('Run'));
    expect(mockPause).not.toHaveBeenCalledWith('Read');
  });

  it('resumes a paused quest', async () => {
    const { getByTestId } = render(<PauseScreen />);
    fireEvent.press(getByTestId('pause-resume-Yoga'));
    await waitFor(() => expect(mockResume).toHaveBeenCalledWith('Yoga'));
  });

  it('comes with suggestions from the burnout banner', () => {
    mockParams = { suggest: '1' };
    const { getByTestId } = render(<PauseScreen />);
    expect(getByTestId('pause-pick-Run').props.accessibilityState).toEqual({ checked: true });
    expect(getByTestId('pause-pick-Read').props.accessibilityState).toEqual({ checked: true });
  });
});

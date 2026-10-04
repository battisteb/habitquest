/**
 * Mood of the day in one tap, and the insights card (free: 1 link, Premium: all).
 */
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockRpc = jest.fn(() => Promise.resolve({ error: null }));
const mockMoods: { day: string; mood: number }[] = [];
jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    rpc: (...a: unknown[]) => mockRpc(...(a as [])),
    from: () => ({
      select: () => ({ gte: () => ({ order: () => Promise.resolve({ data: mockMoods, error: null }) }) }),
    }),
  },
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});

import { MoodCheckIn } from '../components/mood-check-in';
import { MoodInsightsCard } from '../components/mood-insights-card';
import { moodStore$ } from '../stores/mood-store';

describe('MoodCheckIn', () => {
  beforeEach(() => {
    moodStore$.set({ today: null, day: null });
    mockRpc.mockClear();
  });

  it('logs the mood of the day in one tap', async () => {
    const { getByTestId, getByText } = render(<MoodCheckIn />);
    expect(getByText('mood_question')).toBeTruthy();
    fireEvent.press(getByTestId('mood-4'));
    expect(mockRpc).toHaveBeenCalledWith('log_mood', { p_mood: 4 });
    await waitFor(() => expect(getByText('mood_thanks')).toBeTruthy());
    expect(getByTestId('mood-4').props.accessibilityState).toEqual({ selected: true });
  });

  it('leaves the screen once answered for the day (lighter Today)', () => {
    const { localDateKey } = jest.requireActual('../../../lib/local-date');
    moodStore$.set({ today: 3, day: localDateKey() });
    const { queryByTestId } = render(<MoodCheckIn />);
    expect(queryByTestId('mood-check-in')).toBeNull();
  });
});

describe('MoodInsightsCard', () => {
  const day = (n: number) => {
    const d = new Date(2026, 8, 1 + n, 12);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const habits = [
    { id: 'a', name: 'Run', frequency: 'daily' },
    { id: 'b', name: 'Read', frequency: 'daily' },
  ];
  // Both quests on even days, which are the good-mood days: two links.
  const completions = Array.from({ length: 20 }, (_, n) => n)
    .filter((n) => n % 2 === 0)
    .flatMap((n) => ['a', 'b'].map((id) => ({ habit_id: id, completed_at: new Date(2026, 8, 1 + n, 9).toISOString() })));

  beforeEach(() => {
    mockMoods.length = 0;
    mockMoods.push(...Array.from({ length: 20 }, (_, n) => ({ day: day(n), mood: n % 2 === 0 ? 5 : 2 })));
  });

  it('shows one link to a free player and offers the others with Premium', async () => {
    const { findAllByText, getByTestId } = render(<MoodInsightsCard habits={habits} completions={completions} isPremium={false} />);
    expect(await findAllByText('mood_insight_better')).toHaveLength(1);
    fireEvent.press(getByTestId('mood-insights-locked'));
    expect(mockPush).toHaveBeenCalledWith('/paywall');
  });

  it('shows every link to a Premium player', async () => {
    const { findAllByText, queryByTestId } = render(<MoodInsightsCard habits={habits} completions={completions} isPremium />);
    expect(await findAllByText('mood_insight_better')).toHaveLength(2);
    expect(queryByTestId('mood-insights-locked')).toBeNull();
  });

  it('asks for a few more days at first', async () => {
    mockMoods.length = 3;
    const { findByText } = render(<MoodInsightsCard habits={habits} completions={completions} isPremium />);
    expect(await findByText('mood_insights_need_days')).toBeTruthy();
  });
});

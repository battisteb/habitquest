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

import { Text } from 'react-native';
import { MoodPip, MOOD_PIP } from '../components/mood-pip';
import { MoodInsightsCard } from '../components/mood-insights-card';
import { moodStore$ } from '../stores/mood-store';

describe('MoodPip', () => {
  beforeEach(() => {
    moodStore$.set({ today: null, day: null });
    mockRpc.mockClear();
  });

  it('asks the mood next to the hero line and logs it in one tap', async () => {
    const { getByTestId, getByText, queryByText } = render(<MoodPip><Text>hero line</Text></MoodPip>);
    expect(getByText('hero line')).toBeTruthy();
    expect(getByText('mood_pip_question')).toBeTruthy();
    fireEvent.press(getByTestId('mood-4'));
    expect(mockRpc).toHaveBeenCalledWith('log_mood', { p_mood: 4 });
    await waitFor(() => expect(getByTestId('mood-pip-reply')).toBeTruthy());
    expect(queryByText('mood_pip_question')).toBeNull();
  });

  it('wears the mood of the day, and a tap on Pip changes it', () => {
    const { localDateKey } = jest.requireActual('../../../lib/local-date');
    moodStore$.set({ today: 1, day: localDateKey() });
    const { getByTestId, queryByTestId } = render(<MoodPip><Text>hero line</Text></MoodPip>);
    expect(queryByTestId('mood-1')).toBeNull();
    fireEvent.press(getByTestId('mood-pip-face'));
    expect(getByTestId('mood-1').props.accessibilityState).toEqual({ selected: true });
  });

  it('maps every mood to a Pip face', () => {
    for (let m = 1; m <= 5; m++) expect(MOOD_PIP[m]).toBeTruthy();
    expect(MOOD_PIP[1].expression).toBe('sad');
    expect(MOOD_PIP[5].expression).toBe('joy');
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

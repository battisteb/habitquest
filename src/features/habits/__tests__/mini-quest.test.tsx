/**
 * Mini version of a quest (G1, ADR 027): on a hard day the small version
 * keeps the streak, for half the XP.
 */
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
const mockRpc = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({ supabase: { rpc: (...a: unknown[]) => mockRpc(...a) } }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('../../../lib/audio/sound-service', () => ({ playSfx: jest.fn() }));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));

import { HabitCard } from '../components/habit-card';
import { completeHabit, habitsStore$ } from '../stores/habits-store';
import { MINI } from '../../../lib/constants/game-config';

const base = { name: 'Read', category: 'learning', streakCount: 4, onPress: jest.fn(), onComplete: jest.fn() };

describe('mini version', () => {
  it('gives half the XP', () => {
    expect(MINI.XP_FACTOR).toBe(0.5);
  });

  it('shows a mini button only for a quest that has one, until done', () => {
    const onCompleteMini = jest.fn();
    const { getByTestId, rerender, queryByTestId } = render(
      <HabitCard {...base} isCompletedToday={false} onCompleteMini={onCompleteMini} />,
    );
    fireEvent.press(getByTestId('habit-mini'));
    expect(onCompleteMini).toHaveBeenCalledTimes(1);
    rerender(<HabitCard {...base} isCompletedToday onCompleteMini={onCompleteMini} />);
    expect(queryByTestId('habit-mini')).toBeNull();
    rerender(<HabitCard {...base} isCompletedToday={false} />);
    expect(queryByTestId('habit-mini')).toBeNull();
  });

  it('asks the server for the mini version', async () => {
    habitsStore$.habits.set([{ id: 'h1', name: 'Read', category: 'learning', frequency: 'daily', days: null, mini: 'Read 1 page' }] as never);
    habitsStore$.todayCompletions.set({});
    mockRpc.mockResolvedValue({ data: { success: false, reason: 'inactive' }, error: null });
    await completeHabit('h1', undefined, true);
    expect(mockRpc).toHaveBeenCalledWith('complete_habit', expect.objectContaining({ p_habit_id: 'h1', p_mini: true }));
  });

  it('leaves the full version unchanged', async () => {
    mockRpc.mockClear();
    await completeHabit('h1');
    expect(mockRpc.mock.calls[0][1].p_mini).toBeUndefined();
  });
});

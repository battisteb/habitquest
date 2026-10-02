/**
 * A quest validated by mistake can be unchecked: tapping the check of a
 * quest done today undoes it (Today asks for confirmation first).
 */
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));

import { HabitCard } from '../components/habit-card';

const base = { name: 'Run', category: 'fitness', streakCount: 3, onPress: jest.fn() };

describe('HabitCard check button', () => {
  it('validates a quest not done yet', () => {
    const onComplete = jest.fn();
    const onUncomplete = jest.fn();
    const { getByTestId } = render(
      <HabitCard {...base} isCompletedToday={false} onComplete={onComplete} onUncomplete={onUncomplete} />,
    );
    fireEvent.press(getByTestId('habit-check'));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onUncomplete).not.toHaveBeenCalled();
  });

  it('offers to undo a quest validated today', () => {
    const onComplete = jest.fn();
    const onUncomplete = jest.fn();
    const { getByTestId } = render(
      <HabitCard {...base} isCompletedToday onComplete={onComplete} onUncomplete={onUncomplete} />,
    );
    fireEvent.press(getByTestId('habit-check'));
    expect(onUncomplete).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('cannot undo a weekly goal reached on another day', () => {
    const onUncomplete = jest.fn();
    const { getByTestId } = render(
      <HabitCard
        {...base}
        frequency="3x_week"
        weekCompletionCount={3}
        isCompletedToday={false}
        onComplete={jest.fn()}
        onUncomplete={onUncomplete}
      />,
    );
    fireEvent.press(getByTestId('habit-check'));
    expect(onUncomplete).not.toHaveBeenCalled();
  });
});

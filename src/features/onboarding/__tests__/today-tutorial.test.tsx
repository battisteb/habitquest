import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TodayTutorial } from '../components/today-tutorial';
import { tutorialSeen$, resetTutorial } from '../tutorial-state';

// tutorial-state reads storage at import time, so the backing map must live inside the factory.
jest.mock('../../../lib/storage/mmkv', () => {
  const store = new Map<string, string>();
  return {
    mockStore: store,
    storage: {
      getString: (key: string) => store.get(key),
      set: (key: string, value: string) => store.set(key, value),
      delete: (key: string) => store.delete(key),
    },
  };
});

const { mockStore } = jest.requireMock('../../../lib/storage/mmkv') as { mockStore: Map<string, string> };

jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_target, key) => String(key) });
  return { useT: () => T };
});

jest.mock('../../../ui/theme/theme-context', () => ({
  useTheme: () => ({ themeKey: 'default' }),
}));

jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));

describe('TodayTutorial', () => {
  beforeEach(() => {
    act(() => resetTutorial());
  });

  it('steps through every tip and is not shown again', () => {
    const utils = render(<TodayTutorial />);

    expect(utils.getByText('tuto_complete_title')).toBeTruthy();
    expect(utils.getByText('1 / 4')).toBeTruthy();
    fireEvent.press(utils.getByText('TUTO_NEXT'));
    expect(utils.getByText('tuto_streak_title')).toBeTruthy();
    fireEvent.press(utils.getByText('TUTO_NEXT'));
    expect(utils.getByText('tuto_daily_title')).toBeTruthy();
    fireEvent.press(utils.getByText('TUTO_NEXT'));
    expect(utils.getByText('tuto_hero_title')).toBeTruthy();
    expect(utils.queryByText('tuto_skip')).toBeNull();

    fireEvent.press(utils.getByText('TUTO_DONE'));
    expect(utils.queryByText('tuto_hero_title')).toBeNull();
    expect(tutorialSeen$.get()).toBe(true);
    expect(mockStore.get('today-tutorial-seen')).toBe('true');
  });

  it('can be skipped from the first tip', () => {
    const utils = render(<TodayTutorial />);
    fireEvent.press(utils.getByText('tuto_skip'));

    expect(utils.queryByText('tuto_complete_title')).toBeNull();
    expect(tutorialSeen$.get()).toBe(true);
  });

  it('reappears after a reset from settings', () => {
    act(() => tutorialSeen$.set(true));
    const utils = render(<TodayTutorial />);
    expect(utils.queryByText('tuto_complete_title')).toBeNull();

    act(() => resetTutorial());
    expect(utils.getByText('tuto_complete_title')).toBeTruthy();
  });
});

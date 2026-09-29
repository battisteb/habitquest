import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TodayTutorial } from '../components/today-tutorial';
import { tutorialSeen$, resetTutorial } from '../tutorial-state';
import { tourTargets$, emitTourEvent } from '../tour/tour-targets';
import { habitsStore$ } from '../../habits/stores/habits-store';
import {
  saveNotificationPrefs,
  requestPermissions,
} from '../../notifications/utils/notification-service';

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

jest.mock('../../habits/stores/habits-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { habitsStore$: observable({ todayCompletions: {} }) };
});

jest.mock('../../notifications/utils/notification-service', () => ({
  getNotificationPrefs: () => ({
    dailyReminderEnabled: true,
    dailyReminderHour: 9,
    dailyReminderMinute: 0,
    streakRiskEnabled: true,
    weeklyRecapEnabled: true,
  }),
  saveNotificationPrefs: jest.fn(),
  requestPermissions: jest.fn(() => Promise.resolve(false)),
  applyNotificationPrefs: jest.fn(),
}));

const RECT = { x: 20, y: 100, width: 40, height: 40 };

describe('TodayTutorial (guided tour)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    act(() => {
      resetTutorial();
      habitsStore$.todayCompletions.set({});
      tourTargets$.set({ hero: RECT, 'first-check': RECT, missions: RECT, add: RECT });
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('waits for the real actions, then asks about the daily reminder', () => {
    const utils = render(<TodayTutorial />);

    expect(utils.getByText('tuto_hero_title')).toBeTruthy();
    expect(utils.getByText('1 / 6')).toBeTruthy();
    fireEvent.press(utils.getByText('TUTO_NEXT'));

    // Validate a quest: no "next" button, the action moves the tour on.
    expect(utils.getByText('tuto_complete_title')).toBeTruthy();
    expect(utils.queryByText('TUTO_NEXT')).toBeNull();
    act(() => habitsStore$.todayCompletions.set({ h1: true }));

    // Open the missions banner.
    expect(utils.getByText('tuto_daily_title')).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(10);
      emitTourEvent('missions_toggled');
    });

    expect(utils.getByText('tuto_add_title')).toBeTruthy();
    fireEvent.press(utils.getByText('TUTO_NEXT'));
    expect(utils.getByText('tuto_focus_title')).toBeTruthy();
    fireEvent.press(utils.getByText('TUTO_NEXT'));

    expect(utils.getByText('tuto_notif_title')).toBeTruthy();
    fireEvent.press(utils.getByText('8h'));
    fireEvent.press(utils.getByText('TUTO_NOTIF_YES'));

    expect(saveNotificationPrefs).toHaveBeenCalledWith(
      expect.objectContaining({ dailyReminderEnabled: true, dailyReminderHour: 8, dailyReminderMinute: 0 }),
    );
    expect(requestPermissions).toHaveBeenCalled();
    expect(tutorialSeen$.get()).toBe(true);
    expect(mockStore.get('today-tour-v2-seen')).toBe('true');
    expect(utils.queryByText('tuto_notif_title')).toBeNull();
  });

  it('turns the reminder off without asking the system permission', () => {
    const utils = render(<TodayTutorial />);
    for (let i = 0; i < 5; i++) {
      const next = utils.queryByText('TUTO_NEXT') ?? utils.queryByText('tuto_complete_later');
      if (next) fireEvent.press(next);
      else act(() => {
        jest.advanceTimersByTime(10);
        emitTourEvent('missions_toggled');
      });
    }
    fireEvent.press(utils.getByText('tuto_notif_no'));
    expect(saveNotificationPrefs).toHaveBeenCalledWith(expect.objectContaining({ dailyReminderEnabled: false }));
    expect(requestPermissions).not.toHaveBeenCalled();
  });

  it('skips a step whose element is not on screen', () => {
    act(() => tourTargets$.set({ 'first-check': RECT, missions: RECT, add: RECT }));
    const utils = render(<TodayTutorial />);
    expect(utils.getByText('tuto_hero_title')).toBeTruthy();
    act(() => jest.advanceTimersByTime(1600));
    expect(utils.getByText('tuto_complete_title')).toBeTruthy();
  });

  it('can be skipped, and reappears after a reset from settings', () => {
    const utils = render(<TodayTutorial />);
    fireEvent.press(utils.getByText('tuto_skip'));
    expect(utils.queryByText('tuto_hero_title')).toBeNull();
    expect(tutorialSeen$.get()).toBe(true);

    act(() => resetTutorial());
    expect(utils.getByText('tuto_hero_title')).toBeTruthy();
  });
});

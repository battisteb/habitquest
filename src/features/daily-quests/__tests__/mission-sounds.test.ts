const mockPlaySfx = jest.fn(() => Promise.resolve());

jest.mock('../../../lib/audio/sound-service', () => ({ playSfx: (...args: unknown[]) => mockPlaySfx(...(args as [])) }));
jest.mock('../../../lib/supabase/client', () => ({ supabase: { from: jest.fn(), rpc: jest.fn() } }));
jest.mock('../../auth/stores/auth-store', () => ({ authStore$: { user: { get: () => ({ id: 'me' }) } } }));
jest.mock('../../habits/stores/habits-store', () => ({ habitsStore$: { habits: { get: () => [] } } }));

import { playMissionSounds, type DailyQuestWithTemplate } from '../stores/daily-quests-store';
import { localDateKey } from '../../../lib/local-date';

const quest = (id: string, done: boolean) => ({ id, is_completed: done }) as DailyQuestWithTemplate;

describe('mission sounds', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockPlaySfx.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it('chimes when a mission gets done', () => {
    playMissionSounds([quest('a', false), quest('b', false), quest('c', true)], [quest('a', true), quest('b', false), quest('c', true)]);
    jest.advanceTimersByTime(800);
    expect(mockPlaySfx).toHaveBeenCalledWith('mission_done', 0.8);
  });

  it('plays the fanfare when the last mission gets done', () => {
    playMissionSounds([quest('a', true), quest('b', true), quest('c', false)], [quest('a', true), quest('b', true), quest('c', true)]);
    jest.advanceTimersByTime(800);
    expect(mockPlaySfx).toHaveBeenCalledWith('missions_all', 0.8);
  });

  it('stays quiet on the first load or when nothing changed', () => {
    playMissionSounds([], [quest('a', true)]);
    playMissionSounds([quest('a', true)], [quest('a', true)]);
    jest.advanceTimersByTime(800);
    expect(mockPlaySfx).not.toHaveBeenCalled();
  });
});

describe('localDateKey', () => {
  it('uses the local day, not the UTC one', () => {
    const lateEvening = new Date(2026, 9, 2, 23, 30); // 2 Oct 2026, 23:30 local
    expect(localDateKey(lateEvening)).toBe('2026-10-02');
    const justAfterMidnight = new Date(2026, 9, 3, 0, 15);
    expect(localDateKey(justAfterMidnight)).toBe('2026-10-03');
  });
});

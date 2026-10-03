/**
 * Seasonal arcs (ADR 024): runes, the line on the Quests screen with Pip's
 * announcements, and the arc screen.
 */
import { render, waitFor, fireEvent } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
const mockFetch = jest.fn();
jest.mock('../api', () => ({
  ...jest.requireActual('../api'),
  fetchArcState: () => mockFetch(),
}));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockDialog = jest.fn();
jest.mock('../../../lib/app-alert', () => ({ showDialog: (...a: unknown[]) => mockDialog(...a) }));
jest.mock('../../../lib/audio/sound-service', () => ({ playSfx: jest.fn() }));
jest.mock('../../gamification/stores/profile-store', () => ({ refreshProfile: jest.fn() }));
jest.mock('../../habits/stores/habits-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { habitsStore$: observable({ todayCompletions: {} }) };
});
jest.mock('../../stats/utils/share-image', () => ({ shareViewAsImage: jest.fn(() => Promise.resolve('shared')) }));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T, useLang: () => 'en', localeTag: () => 'en-US' };
});

import { runeRows, RUNE_GRID } from '../sprites';
import { Rune } from '../components/rune';
import { ArcBanner } from '../components/arc-banner';
import ArcScreen from '../screens/arc-screen';
import { storage } from '../../../lib/storage/mmkv';
import { SEASONS } from '../../../lib/constants/game-config';
import type { ArcState } from '../api';

const weeks = (good: number, total = 14, current = 3): ArcState['weeks'] =>
  Array.from({ length: total }, (_, i) =>
    i < current
      ? { week_start: `w${i}`, done: i < good ? 6 : 1, planned: 7, good: i < good, current: i === current - 1 }
      : { week_start: `w${i}`, future: true },
  );

const arc = (over: Partial<ArcState> = {}): ArcState => ({
  season: 'winter',
  arc_year: 2026,
  starts_on: '2026-10-01',
  ends_on: '2026-12-31',
  weeks: weeks(2),
  total_weeks: 14,
  good_weeks: 2,
  target: 8,
  rune_earned: false,
  rune_new: false,
  runes: [],
  four_seasons_reward: null,
  four_seasons_done: false,
  ...over,
});

describe('runes', () => {
  it('are 12×12 with a glyph for every season', () => {
    for (const s of SEASONS) {
      const rows = runeRows(s);
      expect(rows).toHaveLength(RUNE_GRID);
      expect(rows.every((r) => r.length === RUNE_GRID)).toBe(true);
      expect(rows.join('')).toContain('g');
    }
  });

  it('are grey until earned', () => {
    expect(render(<Rune season="spring" earned={false} />).getByTestId('rune-spring-locked')).toBeTruthy();
    expect(render(<Rune season="spring" />).getByTestId('rune-spring')).toBeTruthy();
  });
});

describe('ArcBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    storage.delete('arc-seen');
  });

  it('shows the arc progress and opens the arc screen', async () => {
    mockFetch.mockResolvedValue(arc());
    const { findByTestId, getByText } = render(<ArcBanner />);
    fireEvent.press(await findByTestId('arc-banner'));
    expect(mockPush).toHaveBeenCalledWith('/arc');
    expect(getByText('arc_progress')).toBeTruthy();
  });

  it('lets Pip announce a new arc once', async () => {
    mockFetch.mockResolvedValue(arc());
    const first = render(<ArcBanner />);
    await first.findByTestId('arc-banner');
    first.unmount();
    const second = render(<ArcBanner />);
    await second.findByTestId('arc-banner');
    expect(mockDialog.mock.calls.filter(([title]) => title === 'arc_intro_title')).toHaveLength(1);
  });

  it('celebrates a new rune and the four seasons', async () => {
    storage.set('arc-seen', 'winter-2026');
    mockFetch.mockResolvedValue(arc({ rune_new: true, rune_earned: true, four_seasons_reward: 'premium_week',
      runes: SEASONS.map((s) => ({ season: s, arc_year: 2026 })) }));
    render(<ArcBanner />);
    await waitFor(() => expect(mockDialog).toHaveBeenCalledTimes(2));
    expect(mockDialog.mock.calls.map(([t]) => t)).toEqual(['arc_rune_new_title', 'arc_four_title']);
    expect(mockDialog.mock.calls[1][1]).toBe('arc_four_premium_msg');
  });
});

describe('ArcScreen', () => {
  it('shows every week of the arc and the four runes', async () => {
    mockFetch.mockResolvedValue(arc({ runes: [{ season: 'autumn', arc_year: 2025 }] }));
    const { findByTestId, getAllByTestId, getByTestId } = await (async () => {
      const r = render(<ArcScreen />);
      await r.findByTestId('arc-card');
      return r;
    })();
    expect(await findByTestId('arc-card')).toBeTruthy();
    expect(getAllByTestId('arc-week-good')).toHaveLength(2);
    expect(getAllByTestId('arc-week-future')).toHaveLength(11);
    expect(getByTestId('rune-autumn')).toBeTruthy();
    expect(getByTestId('rune-summer-locked')).toBeTruthy();
  });
});

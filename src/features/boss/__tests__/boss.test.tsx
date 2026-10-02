import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { BOSS, hitsToDefeat } from '../../../lib/constants/game-config';
import { BOSS_GRID, BOSS_PALETTES, BOSS_SPRITES, type BossKey } from '../sprites';

const mockFetch = jest.fn();
jest.mock('../api', () => ({ fetchWeeklyBoss: () => mockFetch() }));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../habits/stores/habits-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { habitsStore$: observable({ todayCompletions: {} }) };
});

import { BossCard } from '../components/boss-card';

const boss = (over = {}) => ({
  week_start: '2026-09-28', ends_on: '2026-10-04', boss_key: 'couch_troll', hp_max: 56, damage: 20,
  defeated: false, reward_xp: 50, reward_gold: 25, ...over,
});

describe('weekly boss (I9)', () => {
  it('has a complete sprite with a colour for every pixel', () => {
    for (const key of Object.keys(BOSS_SPRITES) as BossKey[]) {
      const rows = BOSS_SPRITES[key];
      expect(rows).toHaveLength(BOSS_GRID);
      rows.forEach((r) => expect(r).toHaveLength(BOSS_GRID));
      new Set(rows.join('').replace(/\./g, '')).forEach((ch) => expect(BOSS_PALETTES[key][ch]).toBeTruthy());
    }
  });

  it('counts the validations still needed', () => {
    expect(BOSS.HIT).toBe(10);
    expect(hitsToDefeat(56, 20)).toBe(4);
    expect(hitsToDefeat(56, 56)).toBe(0);
  });

  it('shows the boss with its HP, and its story on tap', async () => {
    mockFetch.mockResolvedValueOnce(boss());
    const utils = render(<BossCard />);
    await waitFor(() => expect(utils.getByText('boss_couch_troll_name')).toBeTruthy());
    expect(utils.getByTestId('boss-hp').props.children).toEqual([36, '/', 56]);
    fireEvent.press(utils.getByTestId('boss-card'));
    expect(utils.getByText('boss_couch_troll_story')).toBeTruthy();
  });

  it('celebrates a defeated boss', async () => {
    mockFetch.mockResolvedValueOnce(boss({ damage: 56, defeated: true }));
    const utils = render(<BossCard />);
    await waitFor(() => expect(utils.getByTestId('boss-defeated')).toBeTruthy());
  });
});

import { render } from '@testing-library/react-native';

jest.mock('../../../lib/i18n', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { localeTag: () => 'en-US', LANGS: ['en', 'fr', 'ja'], useT: () => T, lang$: observable('en') };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));

import { WeekBars } from '../components/stats-charts';
import { ShareCard } from '../components/share-card';
import { cellColor, LEVEL_COLORS, LOCKED_COLOR } from '../components/year-pixels';
import { isServerPremium } from '../../gamification/stores/profile-store';

describe('stats components', () => {
  it('shows each of the last 7 days in %, today labelled', () => {
    const days = [
      { date: '2026-09-30', done: 1, due: 2, rate: 0.5 },
      { date: '2026-10-01', done: 2, due: 2, rate: 1 },
    ];
    const screen = render(<WeekBars days={days} today="2026-10-01" />);
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByText('stats_today')).toBeTruthy();
  });

  it('puts the site address on the share card', () => {
    const screen = render(
      <ShareCard username="PixelHero" rank="Warrior" look={{}} bestStreak={21} rate30={0.81} total={1220} weeks={[]} lockedBefore={null} />,
    );
    expect(screen.getByText('gethabitquest.com')).toBeTruthy();
    expect(screen.getByText('81%')).toBeTruthy();
  });

  it('colors a day by its rate and locks days beyond the free history', () => {
    const day = { date: '2026-08-01', done: 2, due: 2, rate: 1 };
    expect(cellColor(day, null)).toBe(LEVEL_COLORS[4]);
    expect(cellColor(day, '2026-09-02')).toBe(LOCKED_COLOR);
    expect(cellColor(null, null)).toBeNull();
  });
});

describe('server Premium status', () => {
  it('is Premium while the subscription has not expired', () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(isServerPremium({ subscription_status: 'premium', subscription_expires_at: null })).toBe(true);
    expect(isServerPremium({ subscription_status: 'premium', subscription_expires_at: future })).toBe(true);
    expect(isServerPremium({ subscription_status: 'premium', subscription_expires_at: past })).toBe(false);
    expect(isServerPremium({ subscription_status: 'free', subscription_expires_at: null })).toBe(false);
  });
});

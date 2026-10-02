/**
 * Rank and level in one card on the profile, changing with the rank.
 */
import { render } from '@testing-library/react-native';

jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T, useLang: () => 'fr' };
});
jest.mock('../../../lib/i18n/labels', () => ({
  titleLabel: (_T: unknown, name: string) => name,
  stageDescription: (_T: unknown, _name: string, description: string) => description,
}));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));

import { RankCard } from '../components/rank-card';
import { RANKS } from '../../../lib/constants/game-config';

describe('RankCard', () => {
  it('shows the rank, the level, the XP and the next rank together', () => {
    const { getByText, getByTestId } = render(<RankCard level={3} currentXp={420} nextLevelXp={600} progress={0.5} />);
    expect(getByTestId('rank-card')).toBeTruthy();
    expect(getByText('APPRENTICE')).toBeTruthy();
    expect(getByText('xp_level_prefix 3')).toBeTruthy();
    expect(getByText('420 / 600 XP')).toBeTruthy();
    expect(getByText('profile_next_stage')).toBeTruthy();
  });

  it('takes the color of each rank', () => {
    for (const rank of RANKS) {
      const { getByText, unmount } = render(<RankCard level={rank.minLevel} currentXp={0} nextLevelXp={100} progress={0} />);
      expect(getByText(rank.name.toUpperCase())).toHaveStyle({ color: rank.color });
      unmount();
    }
  });

  it('shows when the next rank comes at the recent pace', () => {
    const { getByTestId, queryByTestId, rerender } = render(
      <RankCard level={3} currentXp={420} nextLevelXp={600} progress={0.5} recentXp={700} />,
    );
    expect(getByTestId('rank-eta')).toBeTruthy();
    rerender(<RankCard level={3} currentXp={420} nextLevelXp={600} progress={0.5} recentXp={0} />);
    expect(queryByTestId('rank-eta')).toBeNull();
  });

  it('says when the highest rank is reached', () => {
    const top = RANKS[RANKS.length - 1];
    const { getByText } = render(<RankCard level={top.minLevel + 5} currentXp={0} nextLevelXp={100} progress={0} />);
    expect(getByText('profile_max_rank')).toBeTruthy();
  });
});

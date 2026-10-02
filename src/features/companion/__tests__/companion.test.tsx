import { render, fireEvent } from '@testing-library/react-native';
import { Companion } from '../components/companion';
import { COMPANION_GRID, COMPANION_PALETTES, COMPANION_SPRITES } from '../sprites';
import { bestCurrentStreak, companionStage, nextStageStreak } from '../utils/companion-stage';

describe('companion stages', () => {
  it('grows with the streak', () => {
    expect(companionStage(0)).toBe('egg');
    expect(companionStage(2)).toBe('egg');
    expect(companionStage(3)).toBe('hatchling');
    expect(companionStage(7)).toBe('young');
    expect(companionStage(14)).toBe('adult');
    expect(companionStage(29)).toBe('adult');
    expect(companionStage(30)).toBe('legend');
    expect(companionStage(400)).toBe('legend');
  });

  it('tells when the next stage comes', () => {
    expect(nextStageStreak(0)).toBe(3);
    expect(nextStageStreak(8)).toBe(14);
    expect(nextStageStreak(30)).toBeNull();
  });

  it('follows the best current streak', () => {
    expect(bestCurrentStreak([{ current_count: 4 }, { current_count: 11 }, { current_count: null }])).toBe(11);
    expect(bestCurrentStreak([])).toBe(0);
  });

  it('has a complete 16x16 sprite with a color for every pixel', () => {
    for (const [stage, rows] of Object.entries(COMPANION_SPRITES)) {
      expect(rows).toHaveLength(COMPANION_GRID);
      for (const row of rows) {
        expect(row).toHaveLength(COMPANION_GRID);
        for (const ch of row.replace(/\./g, '')) {
          expect(COMPANION_PALETTES[stage as keyof typeof COMPANION_PALETTES][ch]).toBeDefined();
        }
      }
    }
  });
});

describe('<Companion />', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows a locked egg to free players, which opens Premium', () => {
    const onPress = jest.fn();
    const screen = render(<Companion stage="adult" locked onPress={onPress} accessibilityLabel="Premium companion" />);
    expect(screen.getByText('🔒')).toBeTruthy();
    fireEvent.press(screen.getByTestId('companion'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows the dragon of the stage to Premium players', () => {
    const screen = render(<Companion stage="young" />);
    expect(screen.queryByText('🔒')).toBeNull();
  });
});

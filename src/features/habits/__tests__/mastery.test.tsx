import { render, fireEvent, act } from '@testing-library/react-native';
import { STRINGS_FOR_TESTS } from '../../../lib/i18n';
import { canRaiseGoal, goalLabel, masteryStars, nextGoal, renameWithGoal } from '../utils/goal';
import { parseGoal } from '../components/goal-field';
import { MasteryCard } from '../components/mastery-card';
import { raiseHabitGoal } from '../stores/habits-store';

jest.mock('../stores/habits-store', () => ({ raiseHabitGoal: jest.fn() }));

const { fr: FR, en: EN } = STRINGS_FOR_TESTS;
const HABIT = { id: 'h1', name: 'Courir 20 min', goal_value: 20, goal_unit: 'min', mastery_level: 0, mastery_since: null };

describe('habit goals (ADR 033)', () => {
  it('suggests a natural raise for each unit', () => {
    expect(nextGoal(20, 'min')).toBe(25);
    expect(nextGoal(5, 'min')).toBe(7);
    expect(nextGoal(10000, 'steps')).toBe(13000);
    expect(nextGoal(5, 'km')).toBe(6.5);
    expect(nextGoal(3, 'times')).toBe(4);
    expect(nextGoal(1, 'glasses')).toBe(2);
  });

  it('moves the number of the name with the goal', () => {
    expect(renameWithGoal('Courir 20 min', 20, 25)).toBe('Courir 25 min');
    expect(renameWithGoal('20 pompes', 20, 25)).toBe('25 pompes');
    expect(renameWithGoal('Lire 120 pages', 20, 25)).toBe('Lire 120 pages');
    expect(renameWithGoal('Méditer', 10, 15)).toBe('Méditer');
  });

  it('reads the number typed by the player', () => {
    expect(parseGoal('12,5')).toBe(12.5);
    expect(parseGoal(' 20 ')).toBe(20);
    expect(parseGoal('')).toBeNull();
    expect(parseGoal('0')).toBeNull();
  });

  it('writes the goal in the player language', () => {
    expect(goalLabel(FR, 10000, 'steps')).toBe('10000 pas');
    expect(goalLabel(EN, 2.5, 'h')).toBe('2.5 h');
  });

  it('offers a raise after 21 days in a row, then 21 days after each star, up to 3 stars', () => {
    expect(canRaiseGoal(HABIT, 20, '2026-10-14')).toBe(false);
    expect(canRaiseGoal(HABIT, 21, '2026-10-14')).toBe(true);
    expect(canRaiseGoal({ ...HABIT, goal_value: null }, 30, '2026-10-14')).toBe(false);
    expect(canRaiseGoal({ ...HABIT, mastery_level: 1, mastery_since: '2026-10-01' }, 40, '2026-10-14')).toBe(false);
    expect(canRaiseGoal({ ...HABIT, mastery_level: 1, mastery_since: '2026-09-23' }, 40, '2026-10-14')).toBe(true);
    expect(canRaiseGoal({ ...HABIT, mastery_level: 3, mastery_since: '2026-01-01' }, 99, '2026-10-14')).toBe(false);
    expect(masteryStars(2)).toBe('★★');
  });
});

describe('MasteryCard', () => {
  it('asks the server to raise the goal', async () => {
    (raiseHabitGoal as jest.Mock).mockResolvedValue({ success: true, mastery_level: 1 });
    const ui = render(<MasteryCard habit={HABIT} streak={21} />);
    expect(ui.getByTestId('mastery-card')).toBeTruthy();
    await act(async () => fireEvent.press(ui.getByTestId('mastery-raise')));
    expect(raiseHabitGoal).toHaveBeenCalledWith('h1', 25);
    expect(ui.queryByTestId('mastery-card')).toBeNull();
  });

  it('stays hidden before 21 days, and for a week after "Later"', () => {
    expect(render(<MasteryCard habit={HABIT} streak={10} />).queryByTestId('mastery-card')).toBeNull();
    const ui = render(<MasteryCard habit={{ ...HABIT, id: 'h2' }} streak={21} />);
    fireEvent.press(ui.getByTestId('mastery-later'));
    expect(ui.queryByTestId('mastery-card')).toBeNull();
    expect(render(<MasteryCard habit={{ ...HABIT, id: 'h2' }} streak={21} />).queryByTestId('mastery-card')).toBeNull();
  });
});

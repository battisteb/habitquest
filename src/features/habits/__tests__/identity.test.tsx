/**
 * Identity milestones (G3): at 7, 21 and 66 days a quest becomes part of who
 * the player is; the title is kept even after a broken streak.
 */
import { render } from '@testing-library/react-native';

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

import { identityStage, identities, identitySentence, identityTitle, isIdentityMilestone } from '../utils/identity';
import { IdentityCard } from '../components/identity-card';
import { StreakMilestoneOverlay } from '../../../ui/animations/streak-milestone-overlay';
import { STREAK_MILESTONES } from '../../gamification/stores/streak-milestone-store';
import { habitsStore$ } from '../stores/habits-store';
import { getStrings, lang$ } from '../../../lib/i18n';
import { HABIT_CATEGORIES } from '../../../lib/constants/categories';

beforeAll(() => lang$.set('en'));

describe('identity stages', () => {
  it('come at 7, 21 and 66 days of best streak', () => {
    expect(identityStage(6)).toBeNull();
    expect(identityStage(7)).toBe(7);
    expect(identityStage(20)).toBe(7);
    expect(identityStage(21)).toBe(21);
    expect(identityStage(400)).toBe(66);
  });

  it('are celebrated by the streak overlay', () => {
    for (const s of [7, 21, 66]) {
      expect(isIdentityMilestone(s)).toBe(true);
      expect(STREAK_MILESTONES).toContain(s);
    }
    expect(isIdentityMilestone(14)).toBe(false);
  });

  it('have a sentence for every category, in every language', () => {
    for (const lang of ['fr', 'en', 'ja'] as const) {
      lang$.set(lang);
      const T = getStrings();
      for (const c of HABIT_CATEGORIES) {
        const s = identitySentence(T, c);
        expect(s).not.toMatch(/\{phrase\}|identity_/);
      }
    }
    lang$.set('en');
    expect(identitySentence(getStrings(), 'fitness')).toBe("You're becoming someone who moves every day.");
    expect(identitySentence(getStrings(), 'unknown')).toBe("You're becoming someone who keeps their promises.");
    expect(identityTitle(getStrings(), 66)).toBe('Virtuoso');
  });
});

describe('identities list', () => {
  const habits = [
    { id: 'a', name: 'Read', category: 'learning' },
    { id: 'b', name: 'Run', category: 'fitness' },
    { id: 'c', name: 'Water', category: 'health' },
  ];

  it('keeps the titles earned, strongest first, even after a break', () => {
    const list = identities(habits, { a: { longest_count: 9 }, b: { longest_count: 70 }, c: { longest_count: 3 } });
    expect(list.map((e) => [e.name, e.stage])).toEqual([['Run', 66], ['Read', 7]]);
  });
});

describe('IdentityCard', () => {
  it('invites to the first title when there is none', () => {
    habitsStore$.habits.set([]);
    const { getByText } = render(<IdentityCard />);
    expect(getByText(getStrings().profile_identities_empty)).toBeTruthy();
  });

  it('shows each identity and the next step', () => {
    habitsStore$.habits.set([{ id: 'a', name: 'Read', category: 'learning' }] as never);
    habitsStore$.streaks.set({ a: { longest_count: 23 } } as never);
    const { getByText } = render(<IdentityCard />);
    expect(getByText('Adept · Read')).toBeTruthy();
    expect(getByText("You're becoming someone who never stops learning.")).toBeTruthy();
    expect(getByText('Next title at 66 days')).toBeTruthy();
  });
});

describe('milestone overlay', () => {
  it('announces a new identity the first time', () => {
    const { getByTestId, getByText } = render(
      <StreakMilestoneOverlay visible streakCount={21} habitName="Run" category="fitness" newIdentity />,
    );
    expect(getByTestId('identity-sentence').props.children).toBe("You're becoming someone who moves every day.");
    expect(getByText('New title: Adept')).toBeTruthy();
  });

  it('keeps the usual words otherwise', () => {
    const { queryByTestId, getByText } = render(<StreakMilestoneOverlay visible streakCount={21} habitName="Run" />);
    expect(queryByTestId('identity-sentence')).toBeNull();
    expect(getByText('Incredible consistency!')).toBeTruthy();
  });
});

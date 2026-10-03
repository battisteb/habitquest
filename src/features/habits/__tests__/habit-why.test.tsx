/**
 * G2: a quest can say when it happens ("after my morning coffee") and why it
 * matters; Pip quotes them in the quest's reminder and on hard days.
 */
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));

import { MotivationFields, cleanMotivation, WHY_MAX, ANCHOR_MAX } from '../components/motivation-fields';
import { reasonToRemember } from '../components/comeback-banner';
import { habitReminderBody } from '../../notifications/utils/notification-service';
import { lang$ } from '../../../lib/i18n';

describe('motivation fields', () => {
  it('are optional: blank text is saved as nothing', () => {
    expect(cleanMotivation('   ')).toBeNull();
    expect(cleanMotivation('  my coffee ')).toBe('my coffee');
  });

  it('match the database limits', () => {
    const onWhy = jest.fn();
    const onAnchor = jest.fn();
    const { getByTestId } = render(<MotivationFields why="" anchor="" onWhyChange={onWhy} onAnchorChange={onAnchor} />);
    expect(getByTestId('habit-why').props.maxLength).toBe(WHY_MAX);
    expect(getByTestId('habit-anchor').props.maxLength).toBe(ANCHOR_MAX);
    fireEvent.changeText(getByTestId('habit-anchor'), 'my coffee');
    expect(onAnchor).toHaveBeenCalledWith('my coffee');
    expect(WHY_MAX).toBe(140);
    expect(ANCHOR_MAX).toBe(80);
  });
});

describe('reminder text', () => {
  beforeAll(() => lang$.set('en'));

  it('quotes the anchor and the reason', () => {
    expect(habitReminderBody({ anchor: 'my morning coffee', why: 'More energy' }))
      .toBe("After my morning coffee: it's time! 🔥 Remember: More energy");
  });

  it('falls back to the usual text', () => {
    expect(habitReminderBody()).toBe("Time to work on your habit! Don't break the streak 🔥");
  });
});

describe('reason to remember on a hard day', () => {
  const habits = [
    { id: 'a', name: 'Read', why: 'Learn every day' },
    { id: 'b', name: 'Run', why: 'Feel strong' },
    { id: 'c', name: 'Water', why: null },
  ];

  it('picks the quest whose streak broke last', () => {
    const streaks = { a: { broken_at: '2026-10-01T10:00:00Z' }, b: { broken_at: '2026-10-03T10:00:00Z' } };
    expect(reasonToRemember(habits, streaks)).toEqual({ name: 'Run', why: 'Feel strong' });
  });

  it('needs a reason to quote', () => {
    expect(reasonToRemember([habits[2]], {})).toBeNull();
  });
});

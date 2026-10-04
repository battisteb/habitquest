/**
 * Lighter Today: the missions fold into a tile of the goals row; a badge
 * shows when a reward or the chest waits.
 */
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../hooks/use-daily-quests', () => ({ useDailyQuests: () => ({ fetchDailyQuests: jest.fn() }) }));

import { MissionsTile } from '../components/daily-quests-section';
import { dailyQuestsStore$ } from '../stores/daily-quests-store';

const q = (completed: boolean, claimed: boolean) => ({
  id: Math.random().toString(), user_id: 'me', template_id: 't', assigned_date: '2026-10-04',
  current_progress: 1, is_completed: completed, is_claimed: claimed, completed_at: null, claimed_at: null,
  template: {},
});

describe('MissionsTile', () => {
  it('shows the progress and unfolds on tap', () => {
    dailyQuestsStore$.quests.set([q(true, true), q(false, false), q(false, false)] as never);
    const onPress = jest.fn();
    const { getByText, getByTestId } = render(<MissionsTile open={false} onPress={onPress} />);
    expect(getByText('1/3 ▼')).toBeTruthy();
    expect(getByText('📜')).toBeTruthy();
    fireEvent.press(getByTestId('missions-banner'));
    expect(onPress).toHaveBeenCalled();
  });

  it('shows a gift when a reward waits', () => {
    dailyQuestsStore$.quests.set([q(true, false), q(false, false), q(false, false)] as never);
    const { getByText } = render(<MissionsTile open onPress={jest.fn()} />);
    expect(getByText('🎁')).toBeTruthy();
  });
});

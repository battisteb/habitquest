/**
 * The level-up celebration ("Hero Leap"): it appears with the new level and,
 * on a rank threshold, the new rank; it renders nothing when hidden.
 */
import { render } from '@testing-library/react-native';

jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));
jest.mock('../../../lib/i18n', () => {
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T };
});
// Isolate the overlay from the hero stores' module graph (auth, storage, supabase).
jest.mock('@legendapp/state/react', () => ({ use$: () => ({}) }));
jest.mock('../../../features/avatar/stores/avatar-config-store', () => ({ avatarConfigStore$: {} }));
jest.mock('../../../features/shop/stores/shop-store', () => ({ shopStore$: { equippedSlots: {} } }));
jest.mock('../../../features/avatar/renderer/pixel-avatar', () => ({ PixelAvatar: () => null }));

import { LevelUpOverlay } from '../level-up-overlay';

describe('LevelUpOverlay', () => {
  it('shows the new level and the new rank when a rank is reached', () => {
    const { getByTestId, getByText } = render(<LevelUpOverlay visible newLevel={7} />);
    expect(getByTestId('level-up-overlay')).toBeTruthy();
    expect(getByTestId('level-up-number').props.children).toBe(7);
    // Level 7 is the first Knight level, so the rank banner appears.
    expect(getByText('Knight')).toBeTruthy();
  });

  it('shows no rank banner between thresholds', () => {
    const { getByTestId, queryByText } = render(<LevelUpOverlay visible newLevel={8} />);
    expect(getByTestId('level-up-number').props.children).toBe(8);
    expect(queryByText('Knight')).toBeNull();
  });

  it('renders nothing when hidden', () => {
    const { queryByTestId } = render(<LevelUpOverlay visible={false} newLevel={7} />);
    expect(queryByTestId('level-up-overlay')).toBeNull();
  });
});

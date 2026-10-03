/**
 * "How HabitQuest helps you" (G8): every mechanic explained, in every language.
 */
import { render } from '@testing-library/react-native';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));

import HowItHelpsScreen, { HOW_SECTIONS } from '../screens/how-it-helps-screen';
import { getStrings, lang$ } from '../../../lib/i18n';

describe('How HabitQuest helps you', () => {
  it('shows each mechanic with where it lives in the app', () => {
    lang$.set('en');
    const { getByTestId, getByText } = render(<HowItHelpsScreen />);
    for (const s of HOW_SECTIONS) expect(getByTestId(`how-${s}`)).toBeTruthy();
    expect(getByText('What a game cannot do')).toBeTruthy();
  });

  it('is written in every language, with its sources', () => {
    for (const lang of ['fr', 'en', 'ja'] as const) {
      lang$.set(lang);
      const T = getStrings() as Record<string, string>;
      for (const s of HOW_SECTIONS) {
        for (const part of ['title', 'body', 'app']) expect(T[`how_${s}_${part}`]).toBeTruthy();
      }
      expect(T.how_regular_body).toMatch(/Lally/);
      expect(T.how_anchor_body).toMatch(/Gollwitzer/);
    }
    lang$.set('en');
  });
});

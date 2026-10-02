/**
 * The EN / FR switch shown before sign-in and on the first onboarding
 * slide: the whole app switches language at once.
 */
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { LanguageSwitch } from '../language-switch';
import { lang$, useT } from '../../../lib/i18n';

function Probe() {
  const T = useT();
  return <Text testID="probe">{T.tab_shop}</Text>;
}

describe('LanguageSwitch', () => {
  beforeEach(() => lang$.set('en'));

  it('preselects the current language', () => {
    const { getByTestId } = render(<LanguageSwitch />);
    expect(getByTestId('lang-en').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('lang-fr').props.accessibilityState).toEqual({ selected: false });
  });

  it('switches the app language right away', () => {
    const { getByTestId } = render(
      <>
        <LanguageSwitch />
        <Probe />
      </>,
    );
    expect(getByTestId('probe')).toHaveTextContent('SHOP');
    fireEvent.press(getByTestId('lang-fr'));
    expect(lang$.get()).toBe('fr');
    expect(getByTestId('probe')).toHaveTextContent('BOUTIQUE');
  });
});

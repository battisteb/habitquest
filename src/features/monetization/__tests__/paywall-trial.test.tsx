/**
 * The Premium screen with the free trial: what the player sees before
 * committing, and closing the offer counts as "no thanks".
 */
import { render, fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';

const mockBack = jest.fn();
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../lib/i18n', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { localeTag: () => 'en-US', LANGS: ['en', 'fr', 'ja'], useT: () => T, lang$: observable('fr'), getStrings: () => T };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('../../../lib/storage/persist', () => ({ persistPlugin: undefined }));
jest.mock('@legendapp/state/sync', () => ({ syncObservable: jest.fn() }));
jest.mock('react-native-purchases', () => ({}), { virtual: true });
const mockRefused = jest.fn();
jest.mock('../utils/trial-offer', () => ({
  ...jest.requireActual('../utils/trial-offer'),
  recordTrialOfferRefused: () => mockRefused(),
}));

import PaywallScreen from '../../../../app/paywall';
import { subscriptionStore$, PRODUCT_ANNUAL } from '../stores/subscription-store';
import { profileStore$ } from '../../gamification/stores/profile-store';

describe('paywall with the free trial', () => {
  const os = Platform.OS;
  beforeAll(() => { (Platform as { OS: string }).OS = 'ios'; });
  afterAll(() => { (Platform as { OS: string }).OS = os; });
  beforeEach(() => {
    jest.clearAllMocks();
    mockParams = {};
    profileStore$.profile.set(null);
    subscriptionStore$.isPremium.set(false);
    subscriptionStore$.trialEndsAt.set(null);
    subscriptionStore$.trialProducts.set([PRODUCT_ANNUAL]);
  });

  it('offers 14 free days and says exactly what happens next', () => {
    const { getByText, getByTestId } = render(<PaywallScreen />);
    expect(getByText('paywall_trial_title')).toBeTruthy();
    expect(getByText('paywall_trial_cta')).toBeTruthy();
    expect(getByTestId('paywall-trial-terms')).toBeTruthy();
  });

  it('shows the normal offer to a player without a trial', () => {
    subscriptionStore$.trialProducts.set([]);
    const { getByText, queryByTestId } = render(<PaywallScreen />);
    expect(getByText('paywall_hero_title')).toBeTruthy();
    expect(queryByTestId('paywall-trial-terms')).toBeNull();
  });

  it('closing the post-tutorial offer counts as a refusal', () => {
    mockParams = { from: 'tutorial' };
    const { getByLabelText } = render(<PaywallScreen />);
    fireEvent.press(getByLabelText('close'));
    expect(mockRefused).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalled();
  });

  it('closing it from elsewhere does not', () => {
    const { getByLabelText } = render(<PaywallScreen />);
    fireEvent.press(getByLabelText('close'));
    expect(mockRefused).not.toHaveBeenCalled();
  });

  it('during the trial: days left and how to cancel', () => {
    subscriptionStore$.isPremium.set(true);
    subscriptionStore$.trialEndsAt.set(new Date(Date.now() + 5.5 * 24 * 3600_000).toISOString());
    const { getByTestId } = render(<PaywallScreen />);
    expect(getByTestId('paywall-trial-active')).toBeTruthy();
  });
});

import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SupportScreen from '../screens/support-screen';
import { sendSupportMessage, fetchMySupportMessages } from '../support-service';

jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../lib/i18n', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  const T = new Proxy({}, { get: (_t, key) => String(key) });
  return { useT: () => T, lang$: observable('fr') };
});
jest.mock('../../../ui/theme/theme-context', () => ({ useTheme: () => ({ themeKey: 'default' }) }));
jest.mock('../../../lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('../../../lib/supabase/client', () => ({ supabase: {} }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));
jest.mock('../support-service', () => ({
  ...jest.requireActual('../support-service'),
  sendSupportMessage: jest.fn(),
  fetchMySupportMessages: jest.fn(),
}));

const send = sendSupportMessage as jest.Mock;
const fetchMine = fetchMySupportMessages as jest.Mock;

describe('SupportScreen', () => {
  beforeEach(() => {
    send.mockReset();
    fetchMine.mockReset().mockResolvedValue([]);
  });

  it('sends the chosen category and message, then thanks the player', async () => {
    send.mockResolvedValue(null);
    const screen = render(<SupportScreen />);
    fireEvent.press(screen.getByText('support_cat_idea'));
    fireEvent.changeText(screen.getByTestId('support-message'), 'A dark theme please');
    fireEvent.press(screen.getByText('SUPPORT_SEND'));
    await waitFor(() => expect(screen.getByTestId('support-sent')).toBeTruthy());
    expect(send).toHaveBeenCalledWith('idea', 'A dark theme please');
  });

  it('explains why a message was not sent', async () => {
    send.mockResolvedValue('limit');
    const screen = render(<SupportScreen />);
    fireEvent.changeText(screen.getByTestId('support-message'), 'Bug again');
    fireEvent.press(screen.getByText('SUPPORT_SEND'));
    await waitFor(() => expect(screen.getByText('support_error_limit')).toBeTruthy());
  });

  it("shows the player's previous messages with their status", async () => {
    fetchMine.mockResolvedValue([
      { id: '1', category: 'bug', message: 'Shop empty', status: 'done', createdAt: '2026-10-01T08:00:00Z' },
    ]);
    const screen = render(<SupportScreen />);
    await waitFor(() => expect(screen.getByText('Shop empty')).toBeTruthy());
    expect(screen.getByText('support_status_done')).toBeTruthy();
  });
});

const mockRpc = jest.fn((..._args: unknown[]) => Promise.resolve({ error: null }));
const mockGetToken = jest.fn();
const mockPermissions = jest.fn();
const mockConstants: { expoConfig: unknown; easConfig: unknown } = { expoConfig: null, easConfig: null };

jest.mock('react-native', () => ({ Platform: { OS: 'ios' } }));
// Getters: the factory runs before the mock* variables are initialized.
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockConstants.expoConfig;
    },
    get easConfig() {
      return mockConstants.easConfig;
    },
  },
}));
jest.mock('expo-notifications', () => ({
  getPermissionsAsync: () => mockPermissions(),
  requestPermissionsAsync: () => mockPermissions(),
  getExpoPushTokenAsync: (opts: unknown) => mockGetToken(opts),
}));
jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('../../../lib/storage/mmkv', () => ({
  storage: { getString: () => undefined, set: jest.fn(), delete: jest.fn() },
}));
jest.mock('../../../lib/i18n', () => ({ lang$: { get: () => 'en' } }));

import { registerPushToken } from '../utils/notification-service';

describe('registerPushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPermissions.mockResolvedValue({ status: 'granted', granted: true });
    mockGetToken.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockConstants.expoConfig = { extra: { eas: { projectId: 'project-123' } } };
    mockConstants.easConfig = null;
  });

  it('registers the Expo token through the private RPC', async () => {
    await registerPushToken();
    expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'project-123' });
    expect(mockRpc).toHaveBeenCalledWith('register_push_token', { p_token: 'ExponentPushToken[abc]' });
  });

  it('falls back to the EAS config project id', async () => {
    mockConstants.expoConfig = {};
    mockConstants.easConfig = { projectId: 'eas-456' };

    await registerPushToken();

    expect(mockGetToken).toHaveBeenCalledWith({ projectId: 'eas-456' });
  });

  it('does nothing without an EAS project id', async () => {
    mockConstants.expoConfig = {};

    await registerPushToken();

    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('does nothing when notifications are denied', async () => {
    mockPermissions.mockResolvedValue({ status: 'denied', granted: false });

    await registerPushToken();

    expect(mockRpc).not.toHaveBeenCalled();
  });
});

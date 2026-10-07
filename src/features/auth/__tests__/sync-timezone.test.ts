const mockRpc = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { Platform } from 'react-native';
import { getDeviceTimezone, syncTimezone, trackSession } from '../utils/sync-timezone';

describe('syncTimezone', () => {
  beforeEach(() => mockRpc.mockReset());

  it('sends the device IANA timezone to the server', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await syncTimezone();
    expect(mockRpc).toHaveBeenCalledWith('set_timezone', { p_timezone: getDeviceTimezone() });
    expect(getDeviceTimezone()).toMatch(/\w+/);
  });

  it('never throws when offline', async () => {
    mockRpc.mockRejectedValue(new Error('offline'));
    await expect(syncTimezone()).resolves.toBeUndefined();
  });
});

describe('trackSession', () => {
  beforeEach(() => mockRpc.mockReset());

  it('sends the platform to the server', async () => {
    mockRpc.mockResolvedValue({ error: null });
    await trackSession();
    expect(mockRpc).toHaveBeenCalledWith('track_session', { p_platform: Platform.OS });
  });

  it('never throws when offline', async () => {
    mockRpc.mockRejectedValue(new Error('offline'));
    await expect(trackSession()).resolves.toBeUndefined();
  });
});

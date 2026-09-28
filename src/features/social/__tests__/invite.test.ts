const mockRpc = jest.fn();
const mockShare = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  Share: { share: (...args: unknown[]) => mockShare(...args) },
}));
jest.mock('../../../lib/supabase/client', () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock('../../../lib/storage/mmkv', () => {
  const store = new Map<string, string>();
  return {
    storage: {
      getString: (k: string) => store.get(k),
      set: (k: string, v: string) => store.set(k, v),
      delete: (k: string) => store.delete(k),
    },
  };
});

import {
  acceptInvite,
  inviteUrl,
  savePendingInvite,
  shareInvite,
  takePendingInvite,
} from '../utils/invite';

describe('invite links', () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockShare.mockReset();
  });

  it('builds a public web link from the secret code', () => {
    expect(inviteUrl('abc DEF')).toBe('https://habitquest.expo.app/invite/abc%20DEF');
  });

  it('shares the link with the invite message', async () => {
    mockRpc.mockResolvedValue({ data: 'Xy12Ab34Cd', error: null });
    mockShare.mockResolvedValue({ action: 'sharedAction' });

    await expect(shareInvite('Join me!')).resolves.toBe('shared');

    expect(mockRpc).toHaveBeenCalledWith('get_invite_code');
    expect(mockShare).toHaveBeenCalledWith({
      message: 'Join me! https://habitquest.expo.app/invite/Xy12Ab34Cd',
      url: 'https://habitquest.expo.app/invite/Xy12Ab34Cd',
    });
  });

  it('accepts an invite through the server', async () => {
    mockRpc.mockResolvedValue({ data: { status: 'friends', username: 'host', user_id: 'u1' }, error: null });

    await expect(acceptInvite('code1')).resolves.toEqual({ status: 'friends', username: 'host', user_id: 'u1' });
    expect(mockRpc).toHaveBeenCalledWith('accept_invite', { p_code: 'code1' });
  });

  it('keeps a pending invite until it is taken once', () => {
    expect(takePendingInvite()).toBeNull();
    savePendingInvite('code2');
    expect(takePendingInvite()).toBe('code2');
    expect(takePendingInvite()).toBeNull();
  });
});

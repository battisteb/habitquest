const mockEq = jest.fn(() => Promise.resolve({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockUpdateUser = jest.fn(() => Promise.resolve({ error: null }));

jest.mock('../../../lib/supabase/client', () => ({
  supabase: { from: () => ({ update: mockUpdate }), auth: { updateUser: (...args: unknown[]) => mockUpdateUser(...(args as [])) } },
}));
jest.mock('../stores/auth-store', () => {
  const { observable } = jest.requireActual('@legendapp/state');
  return { authStore$: observable({ user: { id: 'me', user_metadata: { language: 'en' } } }) };
});

import { syncLanguage } from '../utils/sync-language';
import { authStore$ } from '../stores/auth-store';

describe('syncLanguage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('saves the app language on the profile, for server notifications', async () => {
    await syncLanguage('me', 'fr');
    expect(mockUpdate).toHaveBeenCalledWith({ language: 'fr' });
    expect(mockEq).toHaveBeenCalledWith('id', 'me');
  });

  it('and in the account metadata, for auth e-mails, only when it changed', async () => {
    await syncLanguage('me', 'fr');
    expect(mockUpdateUser).toHaveBeenCalledWith({ data: { language: 'fr' } });

    authStore$.user.user_metadata.language.set('fr');
    mockUpdateUser.mockClear();
    await syncLanguage('me', 'fr');
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('never throws when offline', async () => {
    mockEq.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    await expect(syncLanguage('me', 'en')).resolves.toBeUndefined();
  });
});

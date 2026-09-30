const mockEq = jest.fn(() => Promise.resolve({ error: null }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));

jest.mock('../../../lib/supabase/client', () => ({
  supabase: { from: () => ({ update: mockUpdate }) },
}));

import { syncLanguage } from '../utils/sync-language';

describe('syncLanguage', () => {
  it('saves the app language on the profile, for server notifications', async () => {
    await syncLanguage('me', 'fr');
    expect(mockUpdate).toHaveBeenCalledWith({ language: 'fr' });
    expect(mockEq).toHaveBeenCalledWith('id', 'me');
  });

  it('never throws when offline', async () => {
    mockEq.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    await expect(syncLanguage('me', 'en')).resolves.toBeUndefined();
  });
});

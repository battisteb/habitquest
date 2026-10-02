/**
 * "Continue with Google": reading the session from the return link, the
 * provider check, and the in-app browser flow.
 */
const mockSignInWithOAuth = jest.fn();
const mockSetSession = jest.fn();
jest.mock('../../../lib/supabase/client', () => ({
  supabase: { auth: { signInWithOAuth: (...a: unknown[]) => mockSignInWithOAuth(...a), setSession: (...a: unknown[]) => mockSetSession(...a) } },
}));
const mockOpenAuthSession = jest.fn();
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: (...a: unknown[]) => mockOpenAuthSession(...a) }));
jest.mock('expo-linking', () => ({ createURL: (path: string) => `habitquest://${path}` }));

import { readSessionTokens, readOAuthError, fetchEnabledProviders, signInWithProvider } from '../utils/oauth';

describe('return link', () => {
  it('reads the session from the fragment', () => {
    expect(readSessionTokens('https://x.app/auth-callback#access_token=a&refresh_token=r&expires_in=3600')).toEqual({
      access_token: 'a',
      refresh_token: 'r',
    });
    expect(readSessionTokens('#access_token=a')).toBeNull();
    expect(readSessionTokens('https://x.app/auth-callback')).toBeNull();
  });

  it('reads an error sent back by the provider', () => {
    expect(readOAuthError('habitquest://auth-callback?error=access_denied&error_description=Cancelled')).toBe('Cancelled');
    expect(readOAuthError('habitquest://auth-callback#access_token=a&refresh_token=r')).toBeNull();
  });
});

describe('provider check', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('is on only when Google is set up in Supabase', async () => {
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ external: { google: true } }) }) as never;
    await expect(fetchEnabledProviders()).resolves.toEqual({ google: true });
    global.fetch = jest.fn().mockResolvedValue({ json: () => Promise.resolve({ external: { email: true } }) }) as never;
    await expect(fetchEnabledProviders()).resolves.toEqual({ google: false });
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as never;
    await expect(fetchEnabledProviders()).resolves.toEqual({ google: false });
  });
});

describe('sign-in in the app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithOAuth.mockResolvedValue({ data: { url: 'https://supabase/authorize' }, error: null });
    mockSetSession.mockResolvedValue({ error: null });
  });

  it('opens Google in an in-app browser and stores the session it returns', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'habitquest://auth-callback#access_token=a&refresh_token=r' });
    await expect(signInWithProvider('google')).resolves.toBe(true);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'habitquest://auth-callback', skipBrowserRedirect: true },
    });
    expect(mockOpenAuthSession).toHaveBeenCalledWith('https://supabase/authorize', 'habitquest://auth-callback');
    expect(mockSetSession).toHaveBeenCalledWith({ access_token: 'a', refresh_token: 'r' });
  });

  it('does nothing when the player closes the browser', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'cancel' });
    await expect(signInWithProvider('google')).resolves.toBe(false);
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it('reports an error sent back by Google', async () => {
    mockOpenAuthSession.mockResolvedValue({ type: 'success', url: 'habitquest://auth-callback?error=server_error' });
    await expect(signInWithProvider('google')).rejects.toThrow('server_error');
  });
});

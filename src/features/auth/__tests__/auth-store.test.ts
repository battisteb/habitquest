import { authStore$ } from '../stores/auth-store';
import { clearUserData } from '../../../lib/storage/user-data';

jest.mock('../../../lib/storage/user-data', () => ({
  clearUserData: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase client
jest.mock('../../../lib/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
    },
    rpc: jest.fn(),
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('authStore$', () => {
  beforeEach(() => {
    authStore$.session.set(null);
    authStore$.user.set(null);
    authStore$.isLoading.set(false);
    authStore$.isInitialized.set(false);
  });

  it('starts with null session and user', () => {
    expect(authStore$.session.get()).toBeNull();
    expect(authStore$.user.get()).toBeNull();
  });

  it('starts uninitialized', () => {
    expect(authStore$.isInitialized.get()).toBe(false);
  });

  it('starts not loading', () => {
    expect(authStore$.isLoading.get()).toBe(false);
  });

  it('initAuth sets isInitialized to true', async () => {
    const { initAuth } = require('../stores/auth-store');
    await initAuth();
    expect(authStore$.isInitialized.get()).toBe(true);
  });

  it('signIn sets loading state', async () => {
    const { supabase } = require('../../../lib/supabase/client');
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });

    const { signIn } = require('../stores/auth-store');
    const promise = signIn('test@test.com', 'password');

    // isLoading should have been set to true synchronously
    expect(authStore$.isLoading.get()).toBe(true);

    await promise;
    expect(authStore$.isLoading.get()).toBe(false);
  });

  it('signIn throws on error', async () => {
    const { supabase } = require('../../../lib/supabase/client');
    supabase.auth.signInWithPassword.mockResolvedValue({
      error: new Error('Invalid credentials'),
    });

    const { signIn } = require('../stores/auth-store');
    await expect(signIn('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    expect(authStore$.isLoading.get()).toBe(false);
  });

  it('signUp passes username in metadata', async () => {
    const { supabase } = require('../../../lib/supabase/client');
    supabase.auth.signUp.mockResolvedValue({ error: null });

    const { signUp } = require('../stores/auth-store');
    await signUp('test@test.com', 'password', 'hero123');

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: 'password',
      options: { data: { username: 'hero123' } },
    });
  });

  describe('signOut', () => {
    it('unregisters the push token before ending the session', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      const calls: string[] = [];
      supabase.rpc.mockImplementation(async (name: string) => {
        calls.push(name);
        return { error: null };
      });
      supabase.auth.signOut.mockImplementation(async () => {
        calls.push('signOut');
        return { error: null };
      });

      const { signOut } = require('../stores/auth-store');
      await signOut();

      expect(calls).toEqual(['unregister_push_token', 'signOut']);
    });

    it('still signs out when the device is offline', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      supabase.rpc.mockRejectedValue(new Error('offline'));
      supabase.auth.signOut.mockResolvedValue({ error: null });

      const { signOut } = require('../stores/auth-store');
      await expect(signOut()).resolves.toBeUndefined();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('deleteAccount', () => {
    it('calls the delete-account function then clears the local session', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      supabase.functions.invoke.mockResolvedValue({ data: { deleted: true }, error: null });
      supabase.auth.signOut.mockResolvedValue({ error: null });

      const { deleteAccount } = require('../stores/auth-store');
      await deleteAccount();

      expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
      expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(authStore$.isLoading.get()).toBe(false);
    });

    it('keeps the session and rethrows when the server fails', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('boom') });
      supabase.auth.signOut.mockClear();

      const { deleteAccount } = require('../stores/auth-store');
      await expect(deleteAccount()).rejects.toThrow('boom');

      expect(supabase.auth.signOut).not.toHaveBeenCalled();
      expect(authStore$.isLoading.get()).toBe(false);
    });
  });

  describe('auth state changes', () => {
    it('clears local user data on SIGNED_OUT only', async () => {
      const { supabase } = require('../../../lib/supabase/client');
      const { initAuth } = require('../stores/auth-store');
      supabase.auth.onAuthStateChange.mockClear();
      await initAuth();
      const listener = supabase.auth.onAuthStateChange.mock.calls[0][0];

      (clearUserData as jest.Mock).mockClear();
      listener('SIGNED_IN', { user: { id: 'u1' } });
      expect(clearUserData).not.toHaveBeenCalled();

      listener('SIGNED_OUT', null);
      expect(clearUserData).toHaveBeenCalledTimes(1);
      expect(authStore$.user.get()).toBeNull();
    });
  });
});

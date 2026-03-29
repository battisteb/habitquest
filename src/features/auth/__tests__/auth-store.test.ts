import { authStore$ } from '../stores/auth-store';

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
});

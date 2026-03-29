import { use$ } from '@legendapp/state/react';
import { authStore$ } from '../stores/auth-store';

export function useAuth() {
  const session = use$(authStore$.session);
  const user = use$(authStore$.user);
  const isLoading = use$(authStore$.isLoading);
  const isInitialized = use$(authStore$.isInitialized);

  return {
    session,
    user,
    isLoading,
    isInitialized,
    isAuthenticated: !!session,
  };
}

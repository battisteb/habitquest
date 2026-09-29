import type { Strings } from '../../../lib/i18n';

/**
 * Turns a Supabase auth error into a message the player understands.
 * Supabase errors carry a stable `code` (and English messages we never show as is).
 */
export function authErrorMessage(T: Strings, error: unknown): string {
  const e = error as { code?: string; message?: string; status?: number } | null;
  const code = e?.code ?? '';
  const message = (e?.message ?? '').toLowerCase();

  if (code === 'invalid_credentials' || message.includes('invalid login credentials')) {
    return T.auth_err_invalid_credentials;
  }
  if (code === 'user_already_exists' || code === 'email_exists' || message.includes('already registered')) {
    return T.auth_err_already_exists;
  }
  if (code === 'weak_password' || message.includes('password should be')) {
    return T.auth_err_weak_password;
  }
  if (code === 'email_not_confirmed') return T.auth_err_email_not_confirmed;
  if (code === 'validation_failed' || code === 'email_address_invalid' || message.includes('invalid format')) {
    return T.auth_err_invalid_email;
  }
  if (code.startsWith('over_') || e?.status === 429) return T.auth_err_rate_limit;
  if (message.includes('network') || message.includes('fetch')) return T.auth_err_network;
  return T.auth_error_default;
}

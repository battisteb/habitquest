/**
 * Reads the session tokens Supabase puts in the reset link
 * (`#access_token=…&refresh_token=…&type=recovery`). Null when the link is
 * not a recovery link or is incomplete.
 */
export function readRecoveryTokens(hash: string): { access_token: string; refresh_token: string } | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (params.get('type') !== 'recovery' || !access_token || !refresh_token) return null;
  return { access_token, refresh_token };
}

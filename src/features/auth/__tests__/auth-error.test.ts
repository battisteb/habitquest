import { authErrorMessage } from '../utils/auth-error';
import { readRecoveryTokens } from '../utils/recovery-link';
import { webAlert } from '../../../lib/web-alert';
import { STRINGS_FOR_TESTS } from '../../../lib/i18n';

const T = STRINGS_FOR_TESTS.fr;

describe('authErrorMessage', () => {
  it.each([
    [{ code: 'invalid_credentials', message: 'Invalid login credentials' }, T.auth_err_invalid_credentials],
    [{ message: 'Invalid login credentials' }, T.auth_err_invalid_credentials],
    [{ code: 'user_already_exists', message: 'User already registered' }, T.auth_err_already_exists],
    [{ code: 'weak_password', message: 'Password should be at least 6 characters.' }, T.auth_err_weak_password],
    [{ code: 'email_not_confirmed' }, T.auth_err_email_not_confirmed],
    [{ code: 'email_address_invalid' }, T.auth_err_invalid_email],
    [{ code: 'over_email_send_rate_limit' }, T.auth_err_rate_limit],
    [{ status: 429 }, T.auth_err_rate_limit],
    [new TypeError('Failed to fetch'), T.auth_err_network],
    [{ code: 'something_new' }, T.auth_error_default],
    [null, T.auth_error_default],
  ])('maps %p', (error, expected) => {
    expect(authErrorMessage(T, error)).toBe(expected);
  });
});

describe('readRecoveryTokens', () => {
  it('reads the tokens of a recovery link', () => {
    expect(readRecoveryTokens('#access_token=a&expires_in=3600&refresh_token=r&token_type=bearer&type=recovery')).toEqual({
      access_token: 'a',
      refresh_token: 'r',
    });
  });

  it('rejects other links', () => {
    expect(readRecoveryTokens('#access_token=a&refresh_token=r&type=signup')).toBeNull();
    expect(readRecoveryTokens('#type=recovery&access_token=a')).toBeNull();
    expect(readRecoveryTokens('')).toBeNull();
  });
});

describe('webAlert', () => {
  const g = globalThis as unknown as { window: { alert: jest.Mock; confirm: jest.Mock } };
  beforeEach(() => {
    g.window = { alert: jest.fn(), confirm: jest.fn() };
  });

  it('shows a simple alert and runs its only button', () => {
    const onPress = jest.fn();
    webAlert('Erreur', 'Oups', [{ text: 'OK', onPress }]);
    expect(g.window.alert).toHaveBeenCalledWith('Erreur\n\nOups');
    expect(onPress).toHaveBeenCalled();
  });

  it('runs the confirm button when accepted, the cancel one otherwise', () => {
    const cancel = jest.fn();
    const confirm = jest.fn();
    const buttons = [{ text: 'Annuler', style: 'cancel' as const, onPress: cancel }, { text: 'Oui', onPress: confirm }];
    g.window.confirm.mockReturnValueOnce(true);
    webAlert('Sûr ?', undefined, buttons);
    expect(confirm).toHaveBeenCalledTimes(1);
    g.window.confirm.mockReturnValueOnce(false);
    webAlert('Sûr ?', undefined, buttons);
    expect(cancel).toHaveBeenCalledTimes(1);
  });
});

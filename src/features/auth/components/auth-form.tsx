import { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelInput } from '../../../ui/components/pixel-input';
import { signIn, signUp, requestPasswordReset } from '../stores/auth-store';
import { authErrorMessage } from '../utils/auth-error';
import { fetchEnabledProviders, signInWithProvider } from '../utils/oauth';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { LanguageSwitch } from '../../../ui/components/language-switch';

type Notice = { kind: 'error' | 'info'; text: string } | null;

export function AuthForm() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  langSwitch: { alignSelf: 'flex-end' },
  title: {
    fontSize: pixelSize(fontSizes.title),
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  form: {
    gap: spacing.md,
  },
  or: { textAlign: 'center', color: colors.textMuted, fontSize: fontSizes.sm, letterSpacing: 2 },
  submitButton: {
    marginTop: spacing.sm,
  },
  // Shown in the form: native alerts do not exist on the web version.
  notice: {
    borderWidth: 2,
    padding: spacing.sm,
    fontSize: fontSizes.sm,
    lineHeight: 18,
  },
  noticeError: {
    borderColor: colors.danger,
    color: colors.danger,
    backgroundColor: colors.danger + '18',
  },
  noticeInfo: {
    borderColor: colors.success,
    color: colors.success,
    backgroundColor: colors.success + '18',
  },
}), [themeKey]);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  // "Continue with Google" shows once the provider is set up in Supabase.
  // Not on iOS yet: Apple requires Sign in with Apple next to any other
  // social sign-in (App Review 4.8), which needs the Apple account (ADR 018).
  const [googleReady, setGoogleReady] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'ios') return;
    let alive = true;
    fetchEnabledProviders().then((p) => alive && setGoogleReady(p.google));
    return () => { alive = false; };
  }, []);

  const handleGoogle = async () => {
    setNotice(null);
    setLoading(true);
    try {
      await signInWithProvider('google');
    } catch {
      setNotice({ kind: 'error', text: T.auth_oauth_failed });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password || (mode === 'sign-up' && !username.trim())) {
      setNotice({ kind: 'error', text: T.auth_err_fill_fields });
      return;
    }

    setNotice(null);
    setLoading(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password, username.trim());
        setNotice({ kind: 'info', text: `${T.auth_account_created_title} ${T.auth_account_created_msg}` });
        setMode('sign-in');
      }
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: authErrorMessage(T, error) });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setNotice({ kind: 'info', text: T.auth_forgot_need_email });
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setNotice({ kind: 'info', text: T.auth_forgot_sent });
    } catch (error: unknown) {
      setNotice({ kind: 'error', text: authErrorMessage(T, error) });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setNotice(null);
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LanguageSwitch style={styles.langSwitch} />
      <View style={styles.header}>
        <Text style={styles.title}>HabitQuest</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign-in' ? T.auth_welcome_back : T.auth_begin_quest}
        </Text>
      </View>

      <View style={styles.form}>
        {mode === 'sign-up' && (
          <PixelInput
            label={T.auth_username_label}
            placeholder={T.auth_hero_name_placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <PixelInput
          label={T.auth_email_label}
          placeholder={T.auth_email_placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <PixelInput
          label={T.auth_password_label}
          placeholder={T.auth_password_placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {notice && (
          <Text
            testID="auth-notice"
            accessibilityRole="alert"
            style={[styles.notice, notice.kind === 'error' ? styles.noticeError : styles.noticeInfo]}
          >
            {notice.text}
          </Text>
        )}

        <PixelButton
          title={mode === 'sign-in' ? T.auth_enter_dungeon : T.auth_create_character}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        />

        {googleReady && (
          <>
            <Text style={styles.or}>{T.auth_or}</Text>
            <PixelButton
              title={T.auth_continue_google}
              onPress={handleGoogle}
              disabled={loading}
              variant="secondary"
              testID="auth-google"
            />
          </>
        )}

        {mode === 'sign-in' && (
          <PixelButton
            title={T.auth_forgot_password}
            onPress={handleForgotPassword}
            disabled={loading}
            variant="ghost"
          />
        )}

        <PixelButton
          title={mode === 'sign-in' ? T.auth_new_signup : T.auth_already_signin}
          onPress={toggleMode}
          variant="ghost"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

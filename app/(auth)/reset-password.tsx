import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase/client';
import { updatePassword } from '../../src/features/auth/stores/auth-store';
import { authErrorMessage } from '../../src/features/auth/utils/auth-error';
import { readRecoveryTokens } from '../../src/features/auth/utils/recovery-link';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelInput } from '../../src/ui/components/pixel-input';
import { colors, spacing, fontSizes } from '../../src/ui/theme/tokens';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';

type Step = 'checking' | 'form' | 'invalid' | 'done';

/** Target of the "forgot password" email link (web page, also opened from the mobile app). */
export default function ResetPasswordScreen() {
  const T = useT();
  const router = useRouter();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md },
    title: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.primary, letterSpacing: 1, textAlign: 'center' },
    subtitle: { fontSize: fontSizes.md, color: colors.textSecondary, textAlign: 'center' },
    message: { fontSize: fontSizes.sm, lineHeight: 18, borderWidth: 2, padding: spacing.sm },
    error: { color: colors.danger, borderColor: colors.danger, backgroundColor: colors.danger + '18' },
    info: { color: colors.success, borderColor: colors.success, backgroundColor: colors.success + '18' },
  }), [themeKey]);
  const [step, setStep] = useState<Step>('checking');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const tokens = Platform.OS === 'web' ? readRecoveryTokens(window.location.hash) : null;
    if (!tokens) {
      setStep('invalid');
      return;
    }
    supabase.auth
      .setSession(tokens)
      .then(({ error: sessionError }) => {
        // Drop the tokens from the address bar once they are in the session.
        window.history.replaceState(null, '', window.location.pathname);
        setStep(sessionError ? 'invalid' : 'form');
      })
      .catch(() => setStep('invalid'));
  }, []);

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      await updatePassword(password);
      setStep('done');
    } catch (e: unknown) {
      setError(authErrorMessage(T, e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{T.auth_reset_title}</Text>
      {step === 'form' && (
        <>
          <Text style={styles.subtitle}>{T.auth_reset_subtitle}</Text>
          <PixelInput
            label={T.auth_password_label}
            placeholder={T.auth_password_placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          {error && <Text style={[styles.message, styles.error]} accessibilityRole="alert">{error}</Text>}
          <PixelButton title={T.auth_reset_submit} onPress={handleSave} disabled={saving || password.length === 0} />
        </>
      )}
      {step === 'invalid' && (
        <>
          <Text style={[styles.message, styles.error]}>{T.auth_reset_invalid_link}</Text>
          <PixelButton title={T.auth_reset_back} onPress={() => router.replace('/(auth)/sign-in')} variant="secondary" />
        </>
      )}
      {step === 'done' && (
        <>
          <Text style={[styles.message, styles.info]}>{T.auth_reset_done}</Text>
          <PixelButton title={T.auth_enter_dungeon} onPress={() => router.replace('/(tabs)/today')} />
        </>
      )}
    </View>
  );
}

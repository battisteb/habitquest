import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelInput } from '../../../ui/components/pixel-input';
import { signIn, signUp } from '../stores/auth-store';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';

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
  title: {
    fontSize: fontSizes.title,
    fontWeight: 'bold',
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
  submitButton: {
    marginTop: spacing.sm,
  },
}), [themeKey]);
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) return;
    if (mode === 'sign-up' && !username) return;

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        await signUp(email, password, username);
        Alert.alert(T.auth_account_created_title, T.auth_account_created_msg);
        setMode('sign-in');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : T.auth_error_default;
      Alert.alert(T.auth_error_title, message);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
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

        <PixelButton
          title={mode === 'sign-in' ? T.auth_enter_dungeon : T.auth_create_character}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        />

        <PixelButton
          title={mode === 'sign-in' ? T.auth_new_signup : T.auth_already_signin}
          onPress={toggleMode}
          variant="ghost"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

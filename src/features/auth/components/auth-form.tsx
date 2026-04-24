import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelInput } from '../../../ui/components/pixel-input';
import { signIn, signUp } from '../stores/auth-store';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

export function AuthForm() {
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
        Alert.alert('Account created', 'You can now sign in.');
        setMode('sign-in');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Error', message);
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
          {mode === 'sign-in' ? 'Welcome back, adventurer!' : 'Begin your quest!'}
        </Text>
      </View>

      <View style={styles.form}>
        {mode === 'sign-up' && (
          <PixelInput
            label="Username"
            placeholder="Your hero name"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <PixelInput
          label="Email"
          placeholder="hero@quest.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <PixelInput
          label="Password"
          placeholder="Secret spell"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <PixelButton
          title={mode === 'sign-in' ? 'Enter the dungeon' : 'Create character'}
          onPress={handleSubmit}
          disabled={loading}
          style={styles.submitButton}
        />

        <PixelButton
          title={mode === 'sign-in' ? 'New here? Sign up' : 'Already a hero? Sign in'}
          onPress={toggleMode}
          variant="ghost"
        />
      </View>
    </KeyboardAvoidingView>
  );
}



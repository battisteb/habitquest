import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { supabase } from '../../src/lib/supabase/client';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, isLoading } = useProfileStats();

  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Pre-fill username once profile loads
  if (!initialized && profile) {
    setUsername(profile.username ?? '');
    setInitialized(true);
  }

  const handleSave = async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      Alert.alert('Invalid username', 'Username cannot be empty.');
      return;
    }
    if (trimmed.length < 3) {
      Alert.alert('Invalid username', 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      Alert.alert('Invalid username', 'Only letters, numbers, and underscores allowed.');
      return;
    }

    setSaving(true);
    const userId = authStore$.user.get()?.id;
    if (!userId) {
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ username: trimmed })
      .eq('id', userId);

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        Alert.alert('Username taken', 'This username is already in use. Choose another.');
      } else {
        Alert.alert('Error', error.message);
      }
      return;
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={[styles.scroll, { paddingTop: insets.top }]}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />

        <View style={styles.header}>
          <Text style={styles.screenLabel}>PROFILE</Text>
          <Text style={styles.title}>Edit Username</Text>
        </View>

        {isLoading ? (
          <Text style={styles.hint}>Loading...</Text>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>USERNAME</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
              <Text style={styles.hint}>
                3–20 chars · letters, numbers, underscores only
              </Text>
            </View>

            <PixelButton
              title={saving ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              disabled={saving}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  screenLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    color: colors.text,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 2,
  },
});

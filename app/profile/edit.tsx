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
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { PixelAvatar } from '../../src/features/avatar/renderer/pixel-avatar';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { authStore$ } from '../../src/features/auth/stores/auth-store';
import { avatarConfigStore$, saveAvatarConfig } from '../../src/features/avatar/stores/avatar-config-store';
import { supabase } from '../../src/lib/supabase/client';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

const SKIN_SWATCHES: string[] = [
  '#f4c98a', '#e8a87c', '#d4845a', '#c46c3c',
  '#a0522d', '#7a3b1e', '#4a2810', '#fce4c8',
];

const HAIR_SWATCHES: string[] = [
  '#4a3728', '#1a1a1a', '#8B4513', '#DAA520',
  '#FF6B35', '#e94560', '#4B0082', '#2d5a1e',
  '#C0C0C0', '#f4c98a',
];

const EYE_SWATCHES: string[] = [
  '#1a1a2e', '#2d5a1e', '#4B6CB7', '#8B4513',
  '#e94560', '#4B0082', '#1a4a3a', '#DAA520',
];

interface SwatchRowProps {
  label: string;
  swatches: string[];
  selected: string;
  onSelect: (color: string) => void;
}

function SwatchRow({ label, swatches, selected, onSelect }: SwatchRowProps) {
  return (
    <View style={swatchStyles.section}>
      <Text style={swatchStyles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={swatchStyles.row}>
        {swatches.map((color) => (
          <Pressable
            key={color}
            onPress={() => onSelect(color)}
            style={[
              swatchStyles.swatch,
              { backgroundColor: color },
              selected === color && swatchStyles.swatchSelected,
            ]}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const swatchStyles = StyleSheet.create({
  section: {
    gap: spacing.xs,
  },
  label: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  swatchSelected: {
    borderColor: '#ffffff',
  },
});

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, isLoading } = useProfileStats();

  const storedSkin = use$(avatarConfigStore$.skinColor);
  const storedHair = use$(avatarConfigStore$.hairColor);
  const storedEye = use$(avatarConfigStore$.eyeColor);

  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const [localSkin, setLocalSkin] = useState(storedSkin);
  const [localHair, setLocalHair] = useState(storedHair);
  const [localEye, setLocalEye] = useState(storedEye);

  // Pre-fill fields once profile loads
  if (!initialized && profile) {
    setUsername(profile.username ?? '');
    setLocalSkin(storedSkin);
    setLocalHair(storedHair);
    setLocalEye(storedEye);
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

    // Save colors (MMKV + fire-and-forget Supabase)
    await saveAvatarConfig(localSkin, localHair, localEye, userId);

    // Save username
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
          <Text style={styles.title}>Edit Profile</Text>
        </View>

        {isLoading ? (
          <Text style={styles.hint}>Loading...</Text>
        ) : (
          <>
            {/* Username field */}
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
                3-20 chars · letters, numbers, underscores only
              </Text>
            </View>

            {/* Avatar appearance section */}
            <View style={styles.appearanceCard}>
              <Text style={styles.appearanceTitle}>AVATAR APPEARANCE</Text>

              {/* Live preview */}
              <View style={styles.previewContainer}>
                <PixelAvatar
                  size={120}
                  skinColor={localSkin}
                  hairColor={localHair}
                  eyeColor={localEye}
                />
              </View>

              {/* Color pickers */}
              <SwatchRow
                label="SKIN"
                swatches={SKIN_SWATCHES}
                selected={localSkin}
                onSelect={setLocalSkin}
              />
              <SwatchRow
                label="HAIR"
                swatches={HAIR_SWATCHES}
                selected={localHair}
                onSelect={setLocalHair}
              />
              <SwatchRow
                label="EYES"
                swatches={EYE_SWATCHES}
                selected={localEye}
                onSelect={setLocalEye}
              />
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
  appearanceCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.md,
  },
  appearanceTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
});

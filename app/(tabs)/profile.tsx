import { View, Text, StyleSheet } from 'react-native';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useAuth } from '../../src/features/auth/hooks/use-auth';
import { signOut } from '../../src/features/auth/stores/auth-store';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function ProfileScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <PixelButton
        title="Sign out"
        onPress={signOut}
        variant="secondary"
        style={styles.signOut}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  title: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: fontSizes.md,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  signOut: {
    marginTop: spacing.xl,
  },
});

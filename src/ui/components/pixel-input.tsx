import { TextInput, View, Text, StyleSheet, type TextInputProps } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../theme/tokens';

interface PixelInputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function PixelInput({ label, error, style, ...props }: PixelInputProps) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label.toUpperCase()}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 2,
    borderRadius: borderRadius.sm,
    padding: spacing.sm + 2,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  inputError: {
    borderColor: colors.danger,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.xs,
    marginTop: spacing.xs,
  },
});

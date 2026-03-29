import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../theme/tokens';

interface PixelButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
}

export function PixelButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: PixelButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.text, variant === 'ghost' && styles.ghostText]}>
        {title.toUpperCase()}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderBottomWidth: 4,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderBottomWidth: 2,
  },
  pressed: {
    borderBottomWidth: 2,
    marginTop: 2,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  ghostText: {
    color: colors.primary,
  },
});

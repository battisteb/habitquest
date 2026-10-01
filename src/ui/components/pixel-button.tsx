import { useMemo } from 'react';
import { Pressable, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../theme/tokens';
import { useTheme } from '../theme/theme-context';
import { hapticLight } from '../../lib/haptics';
import { playSfx } from '../../lib/audio/sound-service';
import { PixelFrame } from './pixel-frame';

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
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const handlePress = () => {
    hapticLight();
    void playSfx('tap', 0.3);
    onPress();
  };

  const label = (
    <Text style={[styles.text, variant === 'ghost' && styles.ghostText]}>
      {title.toUpperCase()}
    </Text>
  );

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      style={[disabled && styles.disabled, style]}
    >
      {({ pressed }) =>
        variant === 'ghost' ? (
          <Text style={[styles.ghost, pressed && styles.ghostPressed]}>{label}</Text>
        ) : (
          <PixelFrame
            pressed={pressed}
            borderColor={variant === 'primary' ? colors.primaryDark : colors.border}
            backgroundColor={variant === 'primary' ? colors.primary : colors.surface}
            contentStyle={styles.face}
          >
            {label}
          </PixelFrame>
        )
      }
    </Pressable>
  );
}

// Rebuilt on theme change: these components are used on every screen.
function createStyles() {
  return StyleSheet.create({
  face: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghost: {
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    textAlign: 'center',
  },
  ghostPressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.text,
    fontSize: pixelSize(fontSizes.md + 1),
    fontFamily: fonts.bold,
    letterSpacing: 1,
  },
  ghostText: {
    color: colors.primary,
  },
});
}

import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { PixelProgress } from '../../../ui/components/pixel-progress';

interface XpBarProps {
  level: number;
  currentXp: number;
  nextLevelXp: number;
  progress: number;
}

export function XpBar({ level, currentXp, nextLevelXp, progress }: XpBarProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  level: {
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.xp,
    letterSpacing: 1,
  },
  xpText: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
}), [themeKey]);
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.level}>{T.xp_level_prefix} {level}</Text>
        <Text style={styles.xpText}>
          {currentXp} / {nextLevelXp} XP
        </Text>
      </View>
      <PixelProgress progress={progress} color={colors.xp} />
    </View>
  );
}



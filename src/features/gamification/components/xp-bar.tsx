import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, fontSizes } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';

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
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.xp,
    letterSpacing: 1,
  },
  xpText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  barTrack: {
    height: 10,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.xp,
    borderRadius: 2,
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
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}



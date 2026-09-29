import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { rarityLabel } from '../../../lib/i18n/labels';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4ecca3',
  rare: '#5b9bd5',
  epic: '#a855f7',
  legendary: '#ff6b35',
};

export function RarityBadge({ rarity }: { rarity: string }) {
  const { themeKey } = useTheme();
  const T = useT();
  const styles = useMemo(() => StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 0,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    letterSpacing: 0.5,
  },
}), [themeKey]);
  const color = RARITY_COLORS[rarity] ?? '#aaa';

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{rarityLabel(T, rarity).toUpperCase()}</Text>
    </View>
  );
}



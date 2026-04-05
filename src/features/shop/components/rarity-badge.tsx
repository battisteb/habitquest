import { View, Text, StyleSheet } from 'react-native';
import { fontSizes, spacing } from '../../../ui/theme/tokens';

const RARITY_COLORS: Record<string, string> = {
  common: '#aaa',
  uncommon: '#4ecca3',
  rare: '#5b9bd5',
  epic: '#a855f7',
  legendary: '#ff6b35',
};

export function RarityBadge({ rarity }: { rarity: string }) {
  const color = RARITY_COLORS[rarity] ?? '#aaa';

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{rarity.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});

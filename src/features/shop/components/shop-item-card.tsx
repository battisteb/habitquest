import { View, Text, StyleSheet, Pressable } from 'react-native';
import { RarityBadge } from './rarity-badge';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';

interface ShopItemCardProps {
  name: string;
  description: string;
  priceGold: number;
  rarity: string;
  requiredLevel: number;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  canUnlock: boolean;
  onPress: () => void;
}

export function ShopItemCard({
  name,
  description,
  priceGold,
  rarity,
  requiredLevel,
  isOwned,
  isEquipped,
  canAfford,
  canUnlock,
  onPress,
}: ShopItemCardProps) {
  const disabled = isOwned ? false : !canAfford || !canUnlock;

  return (
    <Pressable
      style={[
        styles.card,
        isEquipped && styles.cardEquipped,
        !isOwned && !canAfford && styles.cardLocked,
      ]}
      onPress={onPress}
      disabled={disabled && !isOwned}
    >
      {/* Placeholder sprite area */}
      <View style={styles.spriteArea}>
        <Text style={styles.spriteEmoji}>
          {isOwned ? '✓' : '?'}
        </Text>
      </View>

      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <RarityBadge rarity={rarity} />

      {isOwned ? (
        <Text style={[styles.status, isEquipped && styles.statusEquipped]}>
          {isEquipped ? 'EQUIPPED' : 'OWNED'}
        </Text>
      ) : (
        <View style={styles.priceRow}>
          <Text style={[styles.price, !canAfford && styles.priceLocked]}>
            {priceGold}g
          </Text>
          {requiredLevel > 0 && (
            <Text style={[styles.levelReq, !canUnlock && styles.priceLocked]}>
              Lv.{requiredLevel}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.sm,
    gap: spacing.xs,
    flex: 1,
    minWidth: 140,
    maxWidth: '48%' as any,
  },
  cardEquipped: {
    borderColor: colors.accent,
  },
  cardLocked: {
    opacity: 0.5,
  },
  spriteArea: {
    height: 64,
    backgroundColor: colors.background,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  spriteEmoji: {
    fontSize: 24,
    color: colors.textMuted,
  },
  name: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
  status: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.success,
  },
  statusEquipped: {
    color: colors.accent,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.accent,
  },
  priceLocked: {
    color: colors.danger,
  },
  levelReq: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});

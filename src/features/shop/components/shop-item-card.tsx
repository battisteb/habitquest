import { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { PixelAvatar } from '../../avatar/renderer/pixel-avatar';
import { RarityBadge } from './rarity-badge';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';
import { PremiumBadge } from '../../monetization/components/premium-gate';
import { useTheme } from '../../../ui/theme/theme-context';

const RARITY_BORDER: Record<string, string> = {
  common: colors.border,
  uncommon: '#4ecca3',
  rare: '#5b9bd5',
  epic: '#a855f7',
  legendary: '#ff6b35',
};

interface ShopItemCardProps {
  name: string;
  description: string;
  priceGold: number;
  rarity: string;
  requiredLevel: number;
  spriteKey: string;
  category: string;
  isOwned: boolean;
  isEquipped: boolean;
  canAfford: boolean;
  canUnlock: boolean;
  /** Human-readable unlock requirement shown when canUnlock is false */
  unlockLabel?: string;
  /** Item requires Premium subscription */
  isPremiumLocked?: boolean;
  /** Current equipped slots — so preview shows the full equipped look + this item */
  currentHat?: string;
  currentOutfit?: string;
  currentAccessory?: string;
  currentBg?: string;
  onPress: () => void;
}

export function ShopItemCard({
  name,
  description,
  priceGold,
  rarity,
  requiredLevel,
  spriteKey,
  category,
  isOwned,
  isEquipped,
  canAfford,
  canUnlock,
  unlockLabel,
  isPremiumLocked,
  currentHat,
  currentOutfit,
  currentAccessory,
  currentBg,
  onPress,
}: ShopItemCardProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 4,
    borderBottomWidth: 4,
    padding: spacing.sm,
    gap: spacing.xs,
    flex: 1,
    minWidth: 140,
    maxWidth: '48%' as any,
  },
  cardEquipped: {
    backgroundColor: colors.accent + '11',
  },
  cardDisabled: {
    opacity: 0.45,
  },
  previewArea: {
    height: 80,
    backgroundColor: colors.background,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  equippedBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.accent,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  equippedBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.background,
    letterSpacing: 0.5,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: colors.background + 'bb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockIcon: { fontSize: 22 },
  name: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
  status: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
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
  unlockLabel: {
    fontSize: 9,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
}), [themeKey]);
  const disabled = !isOwned && (!canAfford || !canUnlock || !!isPremiumLocked);
  const borderColor = isEquipped
    ? colors.accent
    : RARITY_BORDER[rarity] ?? colors.border;

  // Build preview props: apply this item in its slot, keep everything else
  const previewHat = category === 'avatar_hat' ? spriteKey : currentHat;
  const previewOutfit = category === 'avatar_outfit' ? spriteKey : currentOutfit;
  const previewAccessory = category === 'avatar_accessory' ? spriteKey : currentAccessory;
  const previewBg = category === 'avatar_background' ? spriteKey : currentBg;

  return (
    <Pressable
      style={[
        styles.card,
        { borderColor },
        isEquipped && styles.cardEquipped,
        disabled && styles.cardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      {/* Avatar preview */}
      <View style={styles.previewArea}>
        <PixelAvatar
          size={72}
          hat={previewHat}
          outfit={previewOutfit}
          accessory={previewAccessory}
          background={previewBg}
          idleFrame={0}
        />
        {isEquipped && (
          <View style={styles.equippedBadge}>
            <Text style={styles.equippedBadgeText}>ON</Text>
          </View>
        )}
        {!canUnlock && !isOwned && (
          <View style={styles.lockOverlay}>
            <Text style={styles.lockIcon}>🔒</Text>
          </View>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      <View style={styles.badgeRow}>
        <RarityBadge rarity={rarity} />
        {isPremiumLocked && <PremiumBadge />}
      </View>

      {!isOwned && !canUnlock && unlockLabel && (
        <Text style={styles.unlockLabel} numberOfLines={2}>
          {unlockLabel}
        </Text>
      )}

      {isOwned ? (
        <Text style={[styles.status, isEquipped && styles.statusEquipped]}>
          {isEquipped ? '● EQUIPPED' : '○ OWNED'}
        </Text>
      ) : (
        <View style={styles.priceRow}>
          <Text style={[styles.price, !canAfford && styles.priceLocked]}>
            {priceGold}g
          </Text>
          {requiredLevel > 0 && canUnlock && (
            <Text style={styles.levelReq}>
              Lv.{requiredLevel}
            </Text>
          )}
        </View>
      )}
    </Pressable>
  );
}



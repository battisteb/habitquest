import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { PixelAvatar } from '../../src/features/avatar/renderer/pixel-avatar';
import { ShopItemCard } from '../../src/features/shop/components/shop-item-card';
import {
  shopStore$,
  fetchShop,
  purchaseItem,
  equipItem,
  unequipSlot,
  setActiveTheme,
} from '../../src/features/shop/stores/shop-store';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { habitsStore$ } from '../../src/features/habits/stores/habits-store';
import { isItemUnlocked } from '../../src/features/shop/utils/unlock-checker';
import { SHOP_ITEMS } from '../../src/features/shop/types/shop-item';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { AdBanner } from '../../src/features/monetization/components/ad-banner';
import { usePremium } from '../../src/features/monetization/hooks/use-premium';

const CATEGORIES = [
  { key: 'avatar_hat', label: 'HATS', icon: '🎩' },
  { key: 'avatar_outfit', label: 'OUTFITS', icon: '👕' },
  { key: 'avatar_accessory', label: 'ITEMS', icon: '⚔️' },
  { key: 'avatar_background', label: 'BG', icon: '🌄' },
  { key: 'theme', label: 'THEMES', icon: '🎨' },
];

const CATEGORY_TO_SLOT: Record<string, string> = {
  avatar_hat: 'hat',
  avatar_outfit: 'outfit',
  avatar_accessory: 'accessory',
  avatar_background: 'background',
};

const SLOT_LABELS: Record<string, string> = {
  hat: '🎩',
  outfit: '👕',
  accessory: '⚔️',
  background: '🌄',
};

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = use$(shopStore$.items);
  const ownedItemIds = use$(shopStore$.ownedItemIds);
  const equippedSlots = use$(shopStore$.equippedSlots);
  const isLoading = use$(shopStore$.isLoading);
  const [activeCategory, setActiveCategory] = useState('avatar_hat');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const { profile } = useProfileStats();

  const userGold = profile?.gold ?? 0;
  const userLevel = profile?.level ?? 0;
  const { canViewShopItem } = usePremium();

  // Compute the longest streak across all tracked habits for streak-gated unlocks
  const streaks = use$(habitsStore$.streaks);
  const longestStreak = useMemo(
    () => Math.max(0, ...Object.values(streaks).map((s) => s?.longest_count ?? 0)),
    [streaks],
  );

  // Build a lookup from sprite_key -> static catalog item for streak conditions
  const staticCatalogBySpriteKey = useMemo(
    () =>
      new Map(
        SHOP_ITEMS.map((si) => [si.id.replace(/^(theme|powerup|avatar)_/, ''), si]),
      ),
    [],
  );

  useEffect(() => { fetchShop(); }, []);

  const filteredItems = items.filter((item) => item.category === activeCategory);

  const currentHat = equippedSlots.hat?.item?.sprite_key;
  const currentOutfit = equippedSlots.outfit?.item?.sprite_key;
  const currentAccessory = equippedSlots.accessory?.item?.sprite_key;
  const currentBg = equippedSlots.background?.item?.sprite_key;

  async function handleItemPress(item: (typeof items)[0]) {
    const isOwned = ownedItemIds.includes(item.id);
    const slot = CATEGORY_TO_SLOT[item.category];

    if (isOwned) {
      if (item.category === 'theme') {
        await setActiveTheme(item.sprite_key);
        Alert.alert('Theme Applied', `${item.name} is now active!`);
        return;
      }
      const equipped = equippedSlots[slot];
      if (equipped?.itemId === item.id) {
        await unequipSlot(slot);
      } else {
        await equipItem(item.id, slot);
      }
      return;
    }

    // Not owned — check level lock first
    if (userLevel < item.required_level) {
      Alert.alert(
        'Level too low',
        `This item requires level ${item.required_level}.\nYou are level ${userLevel}.`,
      );
      return;
    }

    // Check streak-based unlock from the static catalog (matched by sprite_key)
    const staticItem = staticCatalogBySpriteKey.get(item.sprite_key);
    if (staticItem && !isItemUnlocked(staticItem, userLevel, longestStreak)) {
      Alert.alert(
        'Not yet unlocked',
        `Unlock condition: ${staticItem.unlockCondition?.label ?? 'Unknown'}`,
      );
      return;
    }

    // Check gold
    if (userGold < item.price_gold) {
      Alert.alert(
        'Not enough gold',
        `You need ${item.price_gold - userGold}g more.\nComplete habits to earn gold!`,
      );
      return;
    }

    Alert.alert(
      `Buy "${item.name}"?`,
      `${item.price_gold}g · ${item.rarity.toUpperCase()}\n\nYou have ${userGold}g. Remaining: ${userGold - item.price_gold}g`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Buy for ${item.price_gold}g`,
          onPress: async () => {
            setPurchasing(item.id);
            try {
              await purchaseItem(item.id);
              // Auto-equip after purchase
              if (slot) await equipItem(item.id, slot);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Purchase failed');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ],
    );
  }

  const ownedCount = filteredItems.filter((i) => ownedItemIds.includes(i.id)).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>SHOP</Text>
          <Text style={styles.goldHint}>Complete habits → earn gold</Text>
        </View>
        <View style={styles.goldBadge}>
          <Text style={styles.goldIcon}>💰</Text>
          <Text style={styles.goldText}>{userGold.toLocaleString()}</Text>
        </View>
      </View>

      {/* Equipped loadout panel */}
      <View style={styles.loadoutPanel}>
        <View style={styles.loadoutLeft}>
          <PixelAvatar
            size={72}
            hat={currentHat}
            outfit={currentOutfit}
            accessory={currentAccessory}
            background={currentBg}
            idleFrame={0}
          />
        </View>
        <View style={styles.loadoutSlots}>
          <Text style={styles.loadoutTitle}>EQUIPPED</Text>
          <View style={styles.slotsGrid}>
            {Object.entries(SLOT_LABELS).map(([slot, icon]) => {
              const eq = equippedSlots[slot];
              const itemName = eq?.item?.name;
              return (
                <Pressable
                  key={slot}
                  style={[styles.slotChip, eq && styles.slotChipFilled]}
                  onPress={eq ? () => unequipSlot(slot) : undefined}
                >
                  <Text style={styles.slotIcon}>{icon}</Text>
                  <Text style={styles.slotName} numberOfLines={1}>
                    {itemName ?? '—'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.loadoutHint}>Tap slot to unequip</Text>
        </View>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryBar}
      >
        {CATEGORIES.map((cat) => {
          const count = items.filter((i) => i.category === cat.key).length;
          if (count === 0) return null;
          return (
            <Pressable
              key={cat.key}
              style={[
                styles.categoryTab,
                activeCategory === cat.key && styles.categoryTabActive,
              ]}
              onPress={() => setActiveCategory(cat.key)}
            >
              <Text style={styles.categoryIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryText,
                  activeCategory === cat.key && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Owned counter */}
      {!isLoading && (
        <Text style={styles.ownedCounter}>
          {ownedCount}/{filteredItems.length} owned
        </Text>
      )}

      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: spacing.xl }}
        />
      ) : (
        <FlatList
          data={filteredItems}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No items in this category</Text>
          }
          renderItem={({ item }) => {
            const slot = CATEGORY_TO_SLOT[item.category];
            const isEquipped = equippedSlots[slot]?.itemId === item.id;
            const isItemLoading = purchasing === item.id;

            // Level condition from DB field
            const meetsLevel = userLevel >= item.required_level;
            // Streak condition from static catalog (matched by sprite_key)
            const staticItem = staticCatalogBySpriteKey.get(item.sprite_key);
            const meetsStreak = staticItem
              ? isItemUnlocked(staticItem, userLevel, longestStreak)
              : true;
            const canUnlock = meetsLevel && meetsStreak;

            // Build a combined unlock label to surface in the card
            const unlockLabel: string | undefined = !meetsLevel
              ? `Reach level ${item.required_level}`
              : !meetsStreak && staticItem?.unlockCondition
              ? staticItem.unlockCondition.label
              : undefined;

            const premiumLocked = !canViewShopItem(item.rarity);

            return (
              <ShopItemCard
                name={item.name}
                description={item.description}
                priceGold={item.price_gold}
                rarity={item.rarity}
                requiredLevel={item.required_level}
                spriteKey={item.sprite_key}
                category={item.category}
                isOwned={ownedItemIds.includes(item.id)}
                isEquipped={isEquipped}
                canAfford={userGold >= item.price_gold}
                canUnlock={canUnlock && !premiumLocked}
                unlockLabel={premiumLocked ? '👑 Premium requis' : unlockLabel}
                isPremiumLocked={premiumLocked}
                currentHat={currentHat}
                currentOutfit={currentOutfit}
                currentAccessory={currentAccessory}
                currentBg={currentBg}
                onPress={() => {
                  if (premiumLocked) {
                    router.push('/paywall');
                    return;
                  }
                  if (!isItemLoading) handleItemPress(item);
                }}
              />
            );
          }}
        />
      )}
      <AdBanner position="bottom" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  goldHint: {
    fontSize: 9,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  goldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    borderBottomWidth: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  goldIcon: { fontSize: 16 },
  goldText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 1,
  },

  // Loadout panel
  loadoutPanel: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderBottomWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
    alignItems: 'center',
  },
  loadoutLeft: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.background,
    padding: 2,
  },
  loadoutSlots: { flex: 1, gap: 4 },
  loadoutTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    maxWidth: '48%',
  },
  slotChipFilled: {
    borderColor: colors.xp + '88',
    backgroundColor: colors.xp + '11',
  },
  slotIcon: { fontSize: 10 },
  slotName: {
    fontSize: 9,
    color: colors.textSecondary,
    fontWeight: 'bold',
    flex: 1,
  },
  loadoutHint: {
    fontSize: 8,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },

  // Category tabs
  categoryScroll: { flexGrow: 0, borderBottomWidth: 2, borderBottomColor: colors.border },
  categoryBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    gap: 2,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  categoryTabActive: {
    borderBottomColor: colors.primary,
  },
  categoryIcon: { fontSize: 14 },
  categoryText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  categoryTextActive: { color: colors.primary },

  ownedCounter: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'right',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    letterSpacing: 0.5,
  },

  grid: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl },
  gridRow: { gap: spacing.sm },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSizes.md,
  },
});

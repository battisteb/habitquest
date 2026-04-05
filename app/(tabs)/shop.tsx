import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
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
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

const CATEGORIES = [
  { key: 'avatar_hat', label: 'HATS' },
  { key: 'avatar_outfit', label: 'OUTFITS' },
  { key: 'avatar_accessory', label: 'ITEMS' },
  { key: 'avatar_background', label: 'BG' },
  { key: 'theme', label: 'THEMES' },
];

const CATEGORY_TO_SLOT: Record<string, string> = {
  avatar_hat: 'hat',
  avatar_outfit: 'outfit',
  avatar_accessory: 'accessory',
  avatar_background: 'background',
};

export default function ShopScreen() {
  const insets = useSafeAreaInsets();
  const items = use$(shopStore$.items);
  const ownedItemIds = use$(shopStore$.ownedItemIds);
  const equippedSlots = use$(shopStore$.equippedSlots);
  const isLoading = use$(shopStore$.isLoading);
  const [activeCategory, setActiveCategory] = useState('avatar_hat');
  const { profile } = useProfileStats();

  const userGold = profile?.gold ?? 0;
  const userLevel = profile?.level ?? 0;

  useEffect(() => {
    fetchShop();
  }, []);

  const filteredItems = items.filter((item) => item.category === activeCategory);

  async function handleItemPress(item: (typeof items)[0]) {
    const isOwned = ownedItemIds.has(item.id);
    const slot = CATEGORY_TO_SLOT[item.category];

    if (isOwned) {
      if (item.category === 'theme') {
        await setActiveTheme(item.sprite_key);
        Alert.alert('Theme Applied', `${item.name} is now active!`);
        return;
      }

      // Toggle equip/unequip
      const equipped = equippedSlots[slot];
      if (equipped?.itemId === item.id) {
        await unequipSlot(slot);
      } else {
        await equipItem(item.id, slot);
      }
      return;
    }

    // Purchase
    Alert.alert(
      'Buy Item',
      `Purchase "${item.name}" for ${item.price_gold} gold?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: async () => {
            try {
              await purchaseItem(item.id);
              Alert.alert('Purchased!', `${item.name} is now yours!`);
            } catch (e: any) {
              Alert.alert('Error', e.message ?? 'Purchase failed');
            }
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>SHOP</Text>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>{userGold}g</Text>
        </View>
      </View>

      {/* Category tabs */}
      <View style={styles.categoryBar}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.key}
            style={[
              styles.categoryTab,
              activeCategory === cat.key && styles.categoryTabActive,
            ]}
            onPress={() => setActiveCategory(cat.key)}
          >
            <Text
              style={[
                styles.categoryText,
                activeCategory === cat.key && styles.categoryTextActive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </View>

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

            return (
              <ShopItemCard
                name={item.name}
                description={item.description}
                priceGold={item.price_gold}
                rarity={item.rarity}
                requiredLevel={item.required_level}
                isOwned={ownedItemIds.has(item.id)}
                isEquipped={isEquipped}
                canAfford={userGold >= item.price_gold}
                canUnlock={userLevel >= item.required_level}
                onPress={() => handleItemPress(item)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  goldBadge: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  goldText: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: colors.accent,
  },
  categoryBar: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  categoryTabActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  categoryTextActive: {
    color: colors.primary,
  },
  grid: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  gridRow: {
    gap: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: fontSizes.md,
  },
});

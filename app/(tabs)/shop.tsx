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
  Modal,
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
import { useTheme } from '../../src/ui/theme/theme-context';

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
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
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

  // Purchase confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalBox: {
    backgroundColor: colors.surface,
    borderWidth: 3,
    borderColor: colors.accent,
    borderBottomWidth: 5,
    borderRadius: 4,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalTitle: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 2,
  },
  modalItemName: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  modalRarity: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  modalPrice: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.accent,
    marginTop: spacing.xs,
  },
  modalGoldAfter: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    width: '100%',
  },
  modalBtn: {
    flex: 1,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 4,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  modalBtnCancel: {
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  modalBtnConfirm: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  modalBtnText: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  modalBtnTextConfirm: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
  },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const items = use$(shopStore$.items);
  const ownedItemIds = use$(shopStore$.ownedItemIds);
  const equippedSlots = use$(shopStore$.equippedSlots);
  const isLoading = use$(shopStore$.isLoading);
  const [activeCategory, setActiveCategory] = useState('avatar_hat');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<(typeof items)[0] | null>(null);
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

  // Declared before handleItemPress to avoid any closure ordering issues
  const isPremiumLocked_map = useMemo(() => {
    const map = new Map<string, boolean>();
    items.forEach((item) => map.set(item.id, !canViewShopItem(item.rarity)));
    return map;
  }, [items, canViewShopItem]);

  async function handleItemPress(item: (typeof items)[0]) {
    try {
      const isOwned = ownedItemIds.includes(item.id);
      const slot = CATEGORY_TO_SLOT[item.category];

      // Already owned → equip/unequip
      if (isOwned) {
        if (item.category === 'theme') {
          await setActiveTheme(item.sprite_key);
          Alert.alert('Thème appliqué !', `${item.name} est maintenant actif.`);
          return;
        }
        const equipped = equippedSlots[slot];
        if (equipped?.itemId === item.id) {
          await unequipSlot(slot);
          Alert.alert('Retiré', `${item.name} a été déséquipé.`);
        } else {
          await equipItem(item.id, slot);
          Alert.alert('Équipé !', `${item.name} est maintenant équipé.`);
        }
        return;
      }

      // Premium lock
      if (isPremiumLocked_map.get(item.id)) {
        Alert.alert('Premium requis', 'Cet item est réservé aux membres Premium.', [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Voir Premium', onPress: () => router.push('/paywall') },
        ]);
        return;
      }

      // Level lock
      if (userLevel < item.required_level) {
        Alert.alert(
          'Niveau insuffisant',
          `Cet item nécessite le niveau ${item.required_level}.\nTu es niveau ${userLevel}.`,
        );
        return;
      }

      // Streak/static catalog unlock
      const staticItem = staticCatalogBySpriteKey.get(item.sprite_key);
      if (staticItem && !isItemUnlocked(staticItem, userLevel, longestStreak)) {
        Alert.alert(
          'Pas encore débloqué',
          `Condition : ${staticItem.unlockCondition?.label ?? 'Inconnue'}`,
        );
        return;
      }

      // Gold check
      if (userGold < item.price_gold) {
        Alert.alert(
          'Or insuffisant',
          `Il te manque ${item.price_gold - userGold}g.\nComplete des habitudes pour gagner de l'or !`,
        );
        return;
      }

      // All good — show in-app confirmation modal (avoids browser dialog blocking)
      setPendingPurchase(item);
    } catch (e: any) {
      console.error('[SHOP] handleItemPress error:', e);
      Alert.alert('Erreur', e.message ?? 'Une erreur est survenue');
    }
  }

  async function handleConfirmPurchase() {
    if (!pendingPurchase) return;
    const item = pendingPurchase;
    const slot = CATEGORY_TO_SLOT[item.category];
    setPendingPurchase(null);
    setPurchasing(item.id);
    try {
      await purchaseItem(item.id);
      if (slot) await equipItem(item.id, slot);
    } catch (e: any) {
      Alert.alert('Erreur', e.message ?? 'Achat échoué');
    } finally {
      setPurchasing(null);
    }
  }

  const ownedCount = filteredItems.filter((i) => ownedItemIds.includes(i.id)).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
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
                  console.log('[SHOP] onPress', item.id, item.name);
                  if (!isItemLoading) handleItemPress(item);
                }}
              />
            );
          }}
        />
      )}
      <AdBanner position="bottom" />

      {/* Purchase confirmation modal — uses React Native Modal to avoid browser dialog blocking on web */}
      <Modal
        visible={!!pendingPurchase}
        transparent
        animationType="fade"
        onRequestClose={() => setPendingPurchase(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>⚔️ CONFIRMER L'ACHAT</Text>
            <Text style={styles.modalItemName}>{pendingPurchase?.name}</Text>
            <Text style={styles.modalRarity}>{pendingPurchase?.rarity?.toUpperCase()}</Text>
            <Text style={styles.modalPrice}>
              💰 {pendingPurchase?.price_gold}g
            </Text>
            <Text style={styles.modalGoldAfter}>
              Restant : {(userGold - (pendingPurchase?.price_gold ?? 0)).toLocaleString()}g
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setPendingPurchase(null)}
              >
                <Text style={styles.modalBtnText}>Annuler</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={handleConfirmPurchase}
              >
                <Text style={styles.modalBtnTextConfirm}>
                  Acheter {pendingPurchase?.price_gold}g
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}



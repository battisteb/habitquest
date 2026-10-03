import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PixelAvatar } from '../../avatar/renderer/pixel-avatar';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelButton } from '../../../ui/components/pixel-button';
import { RUNE_PALETTES } from '../../arc/sprites';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useLang, useT } from '../../../lib/i18n';
import { shopItemText } from '../../../lib/i18n/content';
import type { Season } from '../../../lib/constants/game-config';
import type { Database } from '../../../lib/supabase/types';

type ShopItem = Database['public']['Tables']['shop_items']['Row'];

const ARC_NAMES: Record<Season, string> = {
  winter: 'WINTER ARC',
  spring: 'SPRING ARC',
  summer: 'SUMMER ARC',
  autumn: 'AUTUMN ARC',
};

interface SeasonItemBannerProps {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  /** The player's current look, to preview the item on their own hero. */
  look: { hat?: string; outfit?: string; accessory?: string };
  onBuy: () => void;
  onEquip: () => void;
}

/** The current arc's cape (G6b): sold for gold during the arc only. */
export function SeasonItemBanner({ item, owned, equipped, look, onBuy, onEquip }: SeasonItemBannerProps) {
  const T = useT();
  const lang = useLang();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const season = (item.season ?? 'winter') as Season;
  const color = RUNE_PALETTES[season].s;
  const text = shopItemText(lang, item);
  const preview = { ...look, accessory: item.sprite_key ?? undefined };

  return (
    <PixelFrame borderColor={color} backgroundColor={colors.surface} contentStyle={styles.row} testID="season-item">
      <View style={styles.avatar}>
        <PixelAvatar size={64} idleFrame={0} {...preview} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.badge, { color }]}>{T.season_item_badge.replace('{arc}', ARC_NAMES[season])}</Text>
        <Text style={styles.name} numberOfLines={1}>{text.title}</Text>
        <Text style={styles.sub} numberOfLines={2}>{owned ? T.season_item_owned : T.season_item_until}</Text>
      </View>
      {owned ? (
        <PixelButton title={equipped ? T.monthly_equipped : T.monthly_equip} onPress={onEquip} variant="secondary" disabled={equipped} />
      ) : (
        <PixelButton title={`${item.price_gold} 💰`} onPress={onBuy} testID="season-item-buy" />
      )}
    </PixelFrame>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
    avatar: { width: 64, height: 64 },
    info: { flex: 1, gap: 2 },
    badge: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
    name: { color: colors.text, fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold },
    sub: { color: colors.textMuted, fontSize: fontSizes.xs },
  });
}

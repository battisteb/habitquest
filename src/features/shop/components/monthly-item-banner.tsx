import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PixelAvatar } from '../../avatar/renderer/pixel-avatar';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelButton } from '../../../ui/components/pixel-button';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useLang, useT } from '../../../lib/i18n';
import { shopItemText } from '../../../lib/i18n/content';
import type { Database } from '../../../lib/supabase/types';

type ShopItem = Database['public']['Tables']['shop_items']['Row'];

interface MonthlyItemBannerProps {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  /** The player's current look, to preview the item on their own hero. */
  look: { hat?: string; outfit?: string; accessory?: string };
  onEquip: () => void;
  onUnlock: () => void;
}

/** The Premium item of the month, at the top of the shop. */
export function MonthlyItemBanner({ item, owned, equipped, look, onEquip, onUnlock }: MonthlyItemBannerProps) {
  const T = useT();
  const lang = useLang();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const text = shopItemText(lang, item);
  const preview = {
    ...look,
    ...(item.category === 'avatar_hat' ? { hat: item.sprite_key ?? undefined } : {}),
    ...(item.category === 'avatar_accessory' ? { accessory: item.sprite_key ?? undefined } : {}),
  };

  return (
    <PixelFrame borderColor={colors.accent} backgroundColor={colors.surface} contentStyle={styles.row} testID="monthly-item">
      <View style={styles.avatar}>
        <PixelAvatar size={64} idleFrame={0} {...preview} />
      </View>
      <View style={styles.info}>
        <Text style={styles.badge}>🎁 {T.monthly_badge}</Text>
        <Text style={styles.name} numberOfLines={1}>{text.title}</Text>
        <Text style={styles.sub} numberOfLines={2}>{owned ? T.monthly_owned : T.monthly_locked}</Text>
      </View>
      {owned ? (
        <PixelButton title={equipped ? T.monthly_equipped : T.monthly_equip} onPress={onEquip} variant="secondary" disabled={equipped} />
      ) : (
        <PixelButton title={T.monthly_unlock} onPress={onUnlock} />
      )}
    </PixelFrame>
  );
}

function createStyles() {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm },
    avatar: { width: 64, height: 64 },
    info: { flex: 1, gap: 2 },
    badge: { color: colors.accent, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
    name: { color: colors.text, fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold },
    sub: { color: colors.textMuted, fontSize: fontSizes.xs },
  });
}

import { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { authStore$ } from '../../auth/stores/auth-store';
import { storage } from '../../../lib/storage/mmkv';
import { useT } from '../../../lib/i18n';
import { newlyUnlocked, type UnlockFeature } from '../../../lib/constants/game-config';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelButton } from '../../../ui/components/pixel-button';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { Pip } from '../../mascot/components/pip';

const ROUTE: Record<UnlockFeature, string> = { arena: '/arena', duels: '/duels', coop: '/coop' };
/** After the level-up celebration. */
const DELAY_MS = 3500;

const lastLevelKey = (userId: string) => `unlock-last-level:${userId}`;

/**
 * Pip announces what a new level opens (I6). The last level seen is kept per
 * player, so a first launch or an app update announces nothing old.
 */
export function UnlockAnnouncer() {
  const T = useT();
  const router = useRouter();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const userId = use$(authStore$.user)?.id;
  const level = use$(profileStore$.profile)?.level;
  const [queue, setQueue] = useState<UnlockFeature[]>([]);

  useEffect(() => {
    if (!userId || !level) return;
    const key = lastLevelKey(userId);
    const stored = Number(storage.getString(key) ?? NaN);
    storage.set(key, String(level));
    if (Number.isNaN(stored) || level <= stored) return;
    const opened = newlyUnlocked(stored, level);
    if (opened.length === 0) return;
    const id = setTimeout(() => setQueue((q) => [...q, ...opened]), DELAY_MS);
    return () => clearTimeout(id);
  }, [userId, level]);

  const feature = queue[0];
  if (!feature) return null;
  const close = () => setQueue((q) => q.slice(1));
  const go = () => {
    close();
    router.push(ROUTE[feature] as never);
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={styles.backdrop}>
        <PixelFrame borderColor={colors.accent} backgroundColor={colors.surface} contentStyle={styles.card}>
          <Pip expression="joy" mood="party" size={88} />
          <Text style={styles.kicker}>{T.unlock_kicker}</Text>
          <Text style={styles.title} testID="unlock-title">{T[`unlock_${feature}_title`]}</Text>
          <Text style={styles.body}>{T[`unlock_${feature}_body`]}</Text>
          <PixelButton title={T.unlock_go} onPress={go} style={styles.button} />
          <PixelButton title={T.unlock_later} onPress={close} variant="secondary" style={styles.button} />
        </PixelFrame>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: spacing.lg },
    card: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg },
    kicker: { color: colors.accent, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), letterSpacing: 2 },
    title: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xl), textAlign: 'center' },
    body: { color: colors.textSecondary, fontSize: fontSizes.sm, textAlign: 'center', lineHeight: 20 },
    button: { alignSelf: 'stretch' },
  });
}

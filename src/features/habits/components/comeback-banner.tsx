import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { COMEBACK } from '../../../lib/constants/game-config';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';

/** Hours left in the comeback window (rounded up), null when it is closed. */
export function comebackHoursLeft(until: string | null | undefined, now = Date.now()): number | null {
  if (!until) return null;
  const ms = new Date(until).getTime() - now;
  return Number.isNaN(ms) || ms <= 0 ? null : Math.ceil(ms / 3_600_000);
}

/**
 * After a broken streak there is no penalty: for 24 hours every validation
 * earns double XP (ADR 019). This banner says so, with the time left.
 */
export function ComebackBanner() {
  const T = useT();
  const until = use$(profileStore$.profile)?.comeback_until;
  // Re-render every minute so the hours left stay right.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const hours = comebackHoursLeft(until);
  if (hours === null) return null;

  return (
    <View style={styles.banner} testID="comeback-banner">
      <Text style={styles.title}>{T.comeback_title.replace('{x}', String(COMEBACK.XP_MULTIPLIER))}</Text>
      <Text style={styles.text}>{T.comeback_msg.replace('{h}', String(hours))}</Text>
    </View>
  );
}

const violet = '#a78bfa';

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: violet,
    borderRadius: 0,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginHorizontal: 0,
    marginBottom: spacing.sm,
    gap: 2,
  },
  title: { color: violet, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), letterSpacing: 1 },
  text: { color: colors.textSecondary, fontSize: fontSizes.sm },
});

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { profileStore$ } from '../../gamification/stores/profile-store';
import { habitsStore$ } from '../stores/habits-store';
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
 * The player's own reason to quote on a hard day (G2): the quest whose streak
 * broke most recently, among those with a "why".
 */
export function reasonToRemember(
  habits: { id: string; name: string; why?: string | null }[],
  streaks: Record<string, { broken_at?: string | null } | undefined>,
): { name: string; why: string } | null {
  const withWhy = habits.filter((h) => h.why);
  if (withWhy.length === 0) return null;
  const brokenAt = (id: string) => streaks[id]?.broken_at ?? '';
  const pick = [...withWhy].sort((a, b) => brokenAt(b.id).localeCompare(brokenAt(a.id)))[0];
  return { name: pick.name, why: pick.why as string };
}

/**
 * After a broken streak there is no penalty: for 24 hours every validation
 * earns double XP (ADR 019). This banner says so, with the time left.
 */
export function ComebackBanner() {
  const T = useT();
  const until = use$(profileStore$.profile)?.comeback_until;
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  // Re-render every minute so the hours left stay right.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(timer);
  }, []);
  const hours = comebackHoursLeft(until);
  if (hours === null) return null;
  const reason = reasonToRemember(habits, streaks as Record<string, { broken_at?: string | null }>);

  return (
    <View style={styles.banner} testID="comeback-banner">
      <Text style={styles.title}>{T.comeback_title.replace('{x}', String(COMEBACK.XP_MULTIPLIER))}</Text>
      <Text style={styles.text}>{T.comeback_msg.replace('{h}', String(hours))}</Text>
      {reason && (
        <Text style={styles.why} testID="comeback-why">
          {T.comeback_why.replace('{name}', reason.name).replace('{why}', reason.why)}
        </Text>
      )}
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
  why: { color: colors.text, fontSize: fontSizes.sm, fontStyle: 'italic', marginTop: 2 },
});

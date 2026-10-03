import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { habitsStore$ } from '../stores/habits-store';
import { identities, identitySentence, identityTitle, IDENTITY_STAGES } from '../utils/identity';
import { CATEGORY_CONFIG, type HabitCategory } from '../../../lib/constants/categories';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

/**
 * Profile: the quests that became part of who the player is (G3), with the
 * title earned at 7, 21 or 66 days and the days left to the next one.
 */
export function IdentityCard() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const habits = use$(habitsStore$.habits);
  const streaks = use$(habitsStore$.streaks);
  const list = identities(habits, streaks);

  return (
    <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
      <Text style={styles.title}>{T.profile_identities_title}</Text>
      {list.length === 0 ? (
        <Text style={styles.empty}>{T.profile_identities_empty}</Text>
      ) : (
        list.map((e) => {
          const color = CATEGORY_CONFIG[e.category as HabitCategory]?.color ?? colors.accent;
          const next = IDENTITY_STAGES.find((s) => s > e.best);
          return (
            <View key={e.habitId} style={styles.row} testID={`identity-${e.habitId}`}>
              <Text style={[styles.rowTitle, { color }]} numberOfLines={1}>
                {identityTitle(T, e.stage)} · {e.name}
              </Text>
              <Text style={styles.sentence}>{identitySentence(T, e.category)}</Text>
              {next ? (
                <Text style={styles.next}>{T.profile_identities_next.replace('{n}', String(next))}</Text>
              ) : null}
            </View>
          );
        })
      )}
    </PixelFrame>
  );
}

function createStyles() {
  return StyleSheet.create({
    card: { padding: spacing.md, gap: spacing.sm },
    title: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 1 },
    empty: { color: colors.textMuted, fontSize: fontSizes.sm },
    row: { gap: 2 },
    rowTitle: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), letterSpacing: 0.5 },
    sentence: { color: colors.text, fontSize: fontSizes.sm },
    next: { color: colors.textMuted, fontSize: fontSizes.xs },
  });
}

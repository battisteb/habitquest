import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { fetchMoods } from '../stores/mood-store';
import { moodInsights, MIN_DAYS_EACH, type MoodHabit, type MoodLog } from '../utils/mood-insights';
import type { StatsCompletion } from '../../stats/utils/stats-math';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';

/** Insights a free player sees; Premium sees them all (ADR 023). */
export const FREE_MOOD_INSIGHTS = 1;
const MAX_SHOWN = 5;

/**
 * "What does you good": links between the quests done and the mood of the
 * day, from the player's own data.
 */
export function MoodInsightsCard({
  habits,
  completions,
  isPremium,
}: {
  habits: MoodHabit[];
  completions: StatsCompletion[];
  isPremium: boolean;
}) {
  const T = useT();
  const router = useRouter();
  const [moods, setMoods] = useState<MoodLog[] | null>(null);

  useEffect(() => {
    fetchMoods(120).then(setMoods).catch(() => setMoods([]));
  }, [completions.length]);

  const insights = useMemo(() => (moods ? moodInsights(habits, completions, moods) : []), [habits, completions, moods]);
  if (moods === null) return null;

  const shown = insights.slice(0, isPremium ? MAX_SHOWN : FREE_MOOD_INSIGHTS);
  const locked = isPremium ? 0 : Math.max(0, Math.min(insights.length, MAX_SHOWN) - shown.length);
  const sentence = (delta: number) => (delta > 0 ? T.mood_insight_better : T.mood_insight_worse);

  return (
    <View style={styles.card} testID="mood-insights">
      <Text style={styles.title}>{T.mood_insights_title}</Text>
      {insights.length === 0 ? (
        <Text style={styles.empty}>
          {moods.length < MIN_DAYS_EACH * 2
            ? T.mood_insights_need_days.replace('{n}', String(MIN_DAYS_EACH * 2 - moods.length))
            : T.mood_insights_none}
        </Text>
      ) : (
        shown.map((i) => (
          <View key={i.habitId} style={styles.row}>
            <Text style={[styles.delta, { color: i.delta > 0 ? colors.success : colors.danger }]}>
              {i.delta > 0 ? '▲' : '▼'} {Math.abs(i.delta).toFixed(1)}
            </Text>
            <Text style={styles.text}>
              {sentence(i.delta).replace('{name}', `${i.emoji ? `${i.emoji} ` : ''}${i.name}`)}
            </Text>
          </View>
        ))
      )}
      {locked > 0 && (
        <Pressable onPress={() => router.push('/paywall')} accessibilityRole="button" testID="mood-insights-locked">
          <Text style={styles.locked}>{locked === 1 ? T.mood_insights_locked_one : T.mood_insights_locked.replace('{n}', String(locked))}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), letterSpacing: 1 },
  empty: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  delta: { width: 48, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm) },
  text: { flex: 1, color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 18 },
  locked: { color: colors.accent, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 1 },
});

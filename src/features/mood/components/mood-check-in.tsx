import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { moodStore$, logMood, fetchMoods } from '../stores/mood-store';
import { MOOD_FACES } from '../utils/mood-insights';
import { localDateKey } from '../../../lib/local-date';
import { hapticLight } from '../../../lib/haptics';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';

/**
 * "How do you feel today?" in one tap (ADR 023). Crossed with the quests
 * done, it gives the personal links shown in the stats.
 */
export function MoodCheckIn() {
  const T = useT();
  const state = use$(moodStore$);
  const today = state.day === localDateKey() ? state.today : null;

  useEffect(() => {
    void fetchMoods(1);
  }, []);

  const pick = (mood: number) => {
    hapticLight();
    logMood(mood).catch(() => {
      // Offline: the choice is rolled back, the player can tap again.
    });
  };

  return (
    <View style={styles.card} testID="mood-check-in">
      <Text style={styles.title}>{today ? T.mood_thanks : T.mood_question}</Text>
      <View style={styles.row}>
        {MOOD_FACES.map((face, i) => {
          const mood = i + 1;
          const selected = today === mood;
          return (
            <Pressable
              key={face}
              onPress={() => pick(mood)}
              style={[styles.face, selected && styles.faceSelected, today !== null && !selected && styles.faceDim]}
              accessibilityRole="button"
              accessibilityLabel={T[`mood_${mood}` as 'mood_1']}
              accessibilityState={{ selected }}
              testID={`mood-${mood}`}
              hitSlop={4}
            >
              <Text style={styles.emoji}>{face}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    padding: spacing.sm,
    marginHorizontal: 0,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  title: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.xs },
  face: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    backgroundColor: colors.background,
  },
  faceSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '33' },
  faceDim: { opacity: 0.45 },
  emoji: { fontSize: 22 },
});

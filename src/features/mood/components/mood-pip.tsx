import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { moodStore$, logMood, fetchMoods } from '../stores/mood-store';
import { MOOD_FACES } from '../utils/mood-insights';
import { Pip } from '../../mascot/components/pip';
import type { PipExpression, PipMood } from '../../mascot/sprites';
import { localDateKey } from '../../../lib/local-date';
import { hapticLight } from '../../../lib/haptics';
import { useT } from '../../../lib/i18n';
import { colors, fontSizes, isLightTheme, spacing } from '../../../ui/theme/tokens';

/** Pip wears the player's mood of the day (1 = bad … 5 = great). */
export const MOOD_PIP: Record<number, { expression: PipExpression; mood: PipMood }> = {
  1: { expression: 'sad', mood: 'worried' },
  2: { expression: 'worried', mood: 'worried' },
  3: { expression: 'happy', mood: 'calm' },
  4: { expression: 'happy', mood: 'love' },
  5: { expression: 'joy', mood: 'party' },
};

/**
 * Pip in the hero's speech bubble on the Quests screen (ADR 023): he asks
 * how the player feels, then shows the mood of the day with his face. A tap
 * on Pip changes it. The hero's line stays first (children).
 */
export function MoodPip({ children }: { children: ReactNode }) {
  const T = useT();
  const state = use$(moodStore$);
  const today = state.day === localDateKey() ? state.today : null;
  const [editing, setEditing] = useState(false);
  // Pip's short answer right after a pick, then the bubble goes back to normal.
  const [reply, setReply] = useState<number | null>(null);

  useEffect(() => {
    void fetchMoods(1);
  }, []);
  useEffect(() => {
    if (reply === null) return;
    const timer = setTimeout(() => setReply(null), 3000);
    return () => clearTimeout(timer);
  }, [reply]);

  const asking = today === null || editing;
  const look = today !== null ? MOOD_PIP[today] : { expression: 'happy' as const, mood: 'calm' as const };

  const pick = (mood: number) => {
    hapticLight();
    setEditing(false);
    setReply(mood);
    logMood(mood).catch(() => {
      // Offline: the choice is rolled back, the player can tap again.
    });
  };

  return (
    <View style={styles.row} testID="mood-pip">
      <Pressable
        onPress={() => today !== null && setEditing((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={T.mood_pip_change}
        hitSlop={6}
        testID="mood-pip-face"
      >
        <Pip expression={look.expression} mood={look.mood} size={34} accessibilityLabel="Pip" />
      </Pressable>
      <View style={styles.text}>
        {children}
        {reply !== null && !asking ? (
          <Text style={styles.pipLine} testID="mood-pip-reply">{T[`mood_pip_reply_${reply}` as 'mood_pip_reply_1']}</Text>
        ) : null}
        {asking && (
          <>
            <Text style={styles.pipLine}>{T.mood_pip_question}</Text>
            <View style={styles.faces}>
              {MOOD_FACES.map((face, i) => {
                const mood = i + 1;
                const selected = today === mood;
                return (
                  <Pressable
                    key={face}
                    onPress={() => pick(mood)}
                    style={[styles.face, selected && styles.faceSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={T[`mood_${mood}` as 'mood_1']}
                    accessibilityState={{ selected }}
                    testID={`mood-${mood}`}
                    hitSlop={3}
                  >
                    <Text style={styles.emoji}>{face}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs },
  text: { flex: 1, gap: 3 },
  pipLine: { color: isLightTheme() ? colors.textSecondary : colors.background, fontSize: fontSizes.xs, fontStyle: 'italic', opacity: 0.85 },
  faces: { flexDirection: 'row', gap: 4 },
  face: { flex: 1, alignItems: 'center', paddingVertical: 2, borderWidth: 2, borderColor: 'transparent' },
  faceSelected: { borderColor: colors.primary },
  emoji: { fontSize: 18 },
});

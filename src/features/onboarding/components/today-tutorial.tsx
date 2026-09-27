import { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../ui/components/pixel-button';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { tutorialSeen$, markTutorialSeen } from '../tutorial-state';

/** First-run tips shown over the Today screen, one card at a time. */
export function TodayTutorial() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const seen = use$(tutorialSeen$);
  const [step, setStep] = useState(0);

  const steps = useMemo(
    () => [
      { emoji: '✅', title: T.tuto_complete_title, body: T.tuto_complete_body },
      { emoji: '🔥', title: T.tuto_streak_title, body: T.tuto_streak_body },
      { emoji: '📜', title: T.tuto_daily_title, body: T.tuto_daily_body },
      { emoji: '🛡️', title: T.tuto_hero_title, body: T.tuto_hero_body },
    ],
    [T],
  );

  if (seen) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  function finish() {
    setStep(0);
    markTutorialSeen();
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={finish}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.counter}>
            {step + 1} / {steps.length}
          </Text>
          <Text style={styles.emoji}>{current.emoji}</Text>
          <Text style={styles.title}>{current.title}</Text>
          <Text style={styles.body}>{current.body}</Text>
          <PixelButton
            title={isLast ? T.tuto_done : T.tuto_next}
            onPress={isLast ? finish : () => setStep((s) => s + 1)}
          />
          {!isLast && (
            <Pressable onPress={finish} accessibilityRole="button">
              <Text style={styles.skip}>{T.tuto_skip}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
      padding: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.md,
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    counter: { fontSize: fontSizes.xs, color: colors.textMuted, letterSpacing: 2 },
    emoji: { fontSize: 40 },
    title: { fontSize: fontSizes.lg, fontWeight: 'bold', color: colors.text, textAlign: 'center' },
    body: { fontSize: fontSizes.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
    skip: { fontSize: fontSizes.xs, color: colors.textMuted, textDecorationLine: 'underline' },
  });
}

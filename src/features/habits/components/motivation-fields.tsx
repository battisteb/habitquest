import { View, StyleSheet } from 'react-native';
import { PixelInput } from '../../../ui/components/pixel-input';
import { useT } from '../../../lib/i18n';
import { spacing } from '../../../ui/theme/tokens';

/** Same limits as the habits_why_length / habits_anchor_length checks. */
export const WHY_MAX = 140;
export const ANCHOR_MAX = 80;

/** Trimmed text, or null when empty (both fields are optional). */
export function cleanMotivation(text: string): string | null {
  const t = text.trim();
  return t ? t : null;
}

/**
 * G2: why the quest matters and when it happens ("after my morning coffee").
 * Pip quotes them in this quest's reminders and on hard days.
 */
export function MotivationFields({
  why,
  anchor,
  onWhyChange,
  onAnchorChange,
}: {
  why: string;
  anchor: string;
  onWhyChange: (v: string) => void;
  onAnchorChange: (v: string) => void;
}) {
  const T = useT();
  return (
    <View style={styles.container}>
      <PixelInput
        label={T.habit_anchor_label}
        placeholder={T.habit_anchor_placeholder}
        value={anchor}
        onChangeText={onAnchorChange}
        maxLength={ANCHOR_MAX}
        testID="habit-anchor"
      />
      <PixelInput
        label={T.habit_why_label}
        placeholder={T.habit_why_placeholder}
        value={why}
        onChangeText={onWhyChange}
        maxLength={WHY_MAX}
        testID="habit-why"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
});

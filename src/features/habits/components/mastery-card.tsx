import { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelButton } from '../../../ui/components/pixel-button';
import { useTheme } from '../../../ui/theme/theme-context';
import { colors, fonts, fontSizes, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useT } from '../../../lib/i18n';
import { localDateKey } from '../../../lib/local-date';
import { storage } from '../../../lib/storage/mmkv';
import { showDialog } from '../../../lib/app-alert';
import { raiseHabitGoal } from '../stores/habits-store';
import { canRaiseGoal, goalLabel, nextGoal, type HabitGoal } from '../utils/goal';

const LATER_DAYS = 7;
const laterKey = (habitId: string) => `mastery-later-${habitId}`;

/** The offer is put off for a week when the player answers "Later". */
export function isMasteryPutOff(habitId: string, today = new Date()): boolean {
  const until = storage.getString(laterKey(habitId));
  return !!until && until > localDateKey(today);
}

/**
 * After 21 days in a row (ADR 033): "Ready to go from 20 min to 25 min?". Accepting asks the server
 * to raise the goal; the quest keeps its streak, gains a star and 20 % more XP.
 */
export function MasteryCard({ habit, streak }: { habit: HabitGoal & { id: string; name: string }; streak: number }) {
  const T = useT();
  const { themeKey } = useTheme();
  const [hidden, setHidden] = useState(() => isMasteryPutOff(habit.id));
  const [busy, setBusy] = useState(false);
  const styles = useMemo(() => StyleSheet.create({
    face: { padding: spacing.md, gap: spacing.sm },
    title: { color: '#f0c43c', fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, letterSpacing: 1 },
    body: { color: colors.text, fontSize: pixelSize(fontSizes.sm), lineHeight: 20 },
    buttons: { gap: spacing.xs },
  }), [themeKey]);

  if (hidden || !canRaiseGoal(habit, streak, localDateKey())) return null;
  const unit = habit.goal_unit!;
  const from = goalLabel(T, habit.goal_value!, unit);
  const nextValue = nextGoal(habit.goal_value!, unit);
  const to = goalLabel(T, nextValue, unit);

  const later = () => {
    const until = new Date();
    until.setDate(until.getDate() + LATER_DAYS);
    storage.set(laterKey(habit.id), localDateKey(until));
    setHidden(true);
  };

  const raise = async () => {
    setBusy(true);
    try {
      const result = await raiseHabitGoal(habit.id, nextValue);
      if (result.success) {
        showDialog(T.mastery_done_title, T.mastery_done_msg.replace('{name}', habit.name).replace('{to}', to));
        setHidden(true);
      } else {
        showDialog(T.common_error, T.habit_create_error);
      }
    } catch {
      showDialog(T.common_error, T.habit_create_error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <PixelFrame borderColor="#f0c43c" backgroundColor={colors.surface} contentStyle={styles.face} testID="mastery-card">
      <Text style={styles.title}>{T.mastery_offer_title}</Text>
      <Text style={styles.body}>{T.mastery_offer_body.replace('{from}', from).replace('{to}', to)}</Text>
      <View style={styles.buttons}>
        <PixelButton title={T.mastery_offer_yes.replace('{to}', to)} onPress={raise} disabled={busy} testID="mastery-raise" />
        <PixelButton title={T.mastery_offer_later} onPress={later} variant="ghost" disabled={busy} testID="mastery-later" />
      </View>
    </PixelFrame>
  );
}

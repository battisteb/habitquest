import { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { colors, spacing, fontSizes, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { WEEKDAYS } from '../utils/schedule';

interface DayPickerProps {
  /** ISO weekdays (1 = Monday … 7 = Sunday). */
  value: number[];
  onChange: (days: number[]) => void;
}

/** Seven pixel toggles, Monday to Sunday; at least one day stays selected. */
export function DayPicker({ value, onChange }: DayPickerProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    row: { flexDirection: 'row', gap: spacing.xs },
    day: { flex: 1 },
    face: { paddingVertical: spacing.sm, alignItems: 'center' },
    letter: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
    hint: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), marginTop: spacing.xs },
  }), [themeKey]);

  const letters = T.weekdays_letter.split(',');
  const names = T.weekdays_short.split(',');

  const toggle = (day: number) => {
    if (value.includes(day)) {
      if (value.length > 1) onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day].sort((a, b) => a - b));
    }
  };

  return (
    <View>
      <View style={styles.row} accessibilityLabel={T.habit_create_pick_days}>
        {WEEKDAYS.map((day) => {
          const on = value.includes(day);
          return (
            <Pressable
              key={day}
              style={styles.day}
              onPress={() => toggle(day)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={names[day - 1]}
              testID={`day-${day}`}
            >
              {({ pressed }) => (
                <PixelFrame
                  pressed={pressed}
                  borderColor={on ? colors.primary : colors.border}
                  backgroundColor={on ? colors.primary + '22' : colors.surface}
                  contentStyle={styles.face}
                >
                  <Text style={[styles.letter, { color: on ? colors.primary : colors.textSecondary }]}>{letters[day - 1]}</Text>
                </PixelFrame>
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{T.habit_create_days_hint}</Text>
    </View>
  );
}

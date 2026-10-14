import { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { PixelInput } from '../../../ui/components/pixel-input';
import { useT, type Strings } from '../../../lib/i18n';
import { useTheme } from '../../../ui/theme/theme-context';
import { colors, fonts, fontSizes, pixelSize, spacing } from '../../../ui/theme/tokens';
import { GOAL_UNITS, type GoalUnit } from '../utils/goal';

/** The unit's word without the number ("{n} min" → "min", "{n}分" → "分"). */
export const unitWord = (T: Strings, unit: GoalUnit) => T[`goal_unit_${unit}` as keyof Strings].replace('{n}', '').trim();

/** "20" → 20, "12,5" → 12.5; null when empty or not a positive number. */
export function parseGoal(text: string): number | null {
  const n = Number(text.replace(',', '.').trim());
  return text.trim() && Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
}

/**
 * A quest's goal (ADR 033), optional: a number and a unit. After 21 days in a row the player can
 * raise it and earn a star.
 */
export function GoalField({
  value,
  unit,
  onChange,
}: {
  value: string;
  unit: GoalUnit | null;
  onChange: (value: string, unit: GoalUnit | null) => void;
}) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    container: { gap: spacing.sm },
    label: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
    row: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
    number: { width: 96 },
    scrollRow: { flexDirection: 'row', gap: spacing.xs + 2, paddingRight: spacing.md, paddingBottom: 2 },
    chip: {
      paddingVertical: spacing.xs + 2,
      paddingHorizontal: spacing.sm,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
    chipText: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
    chipTextActive: { color: colors.primary },
    hint: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs) },
  }), [themeKey]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{T.habit_goal_label}</Text>
      <View style={styles.row}>
        <View style={styles.number}>
          <PixelInput
            accessibilityLabel={T.habit_goal_label}
            placeholder={T.habit_goal_placeholder}
            value={value}
            onChangeText={(v) => onChange(v.replace(/[^0-9.,]/g, ''), unit ?? (v ? 'min' : unit))}
            keyboardType="decimal-pad"
            maxLength={7}
            testID="habit-goal-value"
          />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollRow}>
        {GOAL_UNITS.map((u) => {
          const active = unit === u;
          return (
            <Pressable
              key={u}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(value, active ? null : u)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              testID={`habit-goal-unit-${u}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{unitWord(T, u)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={styles.hint}>{T.habit_goal_hint}</Text>
    </View>
  );
}

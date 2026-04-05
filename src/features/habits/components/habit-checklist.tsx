import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import type { ChecklistItem } from '../types/habit-content';

interface HabitChecklistProps {
  items: ChecklistItem[];
  onComplete: () => void;
}

export function HabitChecklist({ items, onComplete }: HabitChecklistProps) {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const allDone = checked.size === items.length;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const doneCount = checked.size;
  const totalCount = items.length;
  const progress = totalCount > 0 ? doneCount / totalCount : 0;

  return (
    <View style={styles.container}>
      {/* Progress header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressLabel}>
          {doneCount}/{totalCount} steps
        </Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>

      {/* Items */}
      <View style={styles.list}>
        {items.map((item) => {
          const isDone = checked.has(item.id);
          return (
            <Pressable
              key={item.id}
              style={[styles.item, isDone && styles.itemDone]}
              onPress={() => toggle(item.id)}
            >
              <View style={[styles.checkbox, isDone && styles.checkboxDone]}>
                {isDone && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={[styles.itemLabel, isDone && styles.itemLabelDone]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Complete button */}
      {allDone && (
        <Pressable style={styles.completeButton} onPress={onComplete}>
          <Text style={styles.completeButtonText}>COMPLETE ✓</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  progressHeader: {
    gap: spacing.xs,
  },
  progressLabel: {
    color: colors.textSecondary,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  list: {
    gap: spacing.xs + 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
  },
  itemDone: {
    opacity: 0.6,
    borderColor: colors.success,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  checkmark: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
  },
  itemLabel: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.md,
  },
  itemLabelDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  completeButton: {
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#2ea87a',
    borderBottomWidth: 4,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  completeButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
});

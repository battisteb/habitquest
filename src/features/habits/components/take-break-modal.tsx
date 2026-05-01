import { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { habitsStore$, pauseHabit, getWeeklyTarget } from '../stores/habits-store';
import { recordBreakTaken } from '../stores/burnout-store';
import { colors, fontSizes, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

interface TakeBreakModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called after the user confirms a break (success path only) */
  onBreakTaken?: (pausedCount: number) => void;
}

interface ScoredHabit {
  id: string;
  name: string;
  category: string;
  completionRatio: number;
  weeklyDone: number;
  weeklyTarget: number;
}

export function TakeBreakModal({ visible, onClose, onBreakTaken }: TakeBreakModalProps) {
  const { themeKey } = useTheme();
  const styles = useMemo(() => createStyles(), [themeKey]);

  const habits = use$(habitsStore$.habits);
  const weekCompletions = use$(habitsStore$.weekCompletions);

  const scored: ScoredHabit[] = useMemo(() => {
    return habits
      .filter((h: any) => !h.is_archived && !h.is_paused)
      .map((h: any) => {
        const weeklyTarget = getWeeklyTarget(h.frequency);
        const weeklyDone = weekCompletions[h.id] ?? 0;
        const completionRatio = weeklyTarget > 0 ? weeklyDone / weeklyTarget : 1;
        return {
          id: h.id,
          name: h.name,
          category: h.category,
          completionRatio,
          weeklyDone,
          weeklyTarget,
        };
      })
      .sort((a, b) => a.completionRatio - b.completionRatio);
  }, [habits, weekCompletions]);

  // Default: pre-select the 2 habits with lowest completion ratio
  const defaultSelected = useMemo(
    () => new Set(scored.slice(0, Math.min(2, scored.length)).map((h) => h.id)),
    [scored],
  );
  const [selected, setSelected] = useState<Set<string>>(defaultSelected);
  const [pausing, setPausing] = useState(false);

  // Re-sync defaults when modal reopens with new data
  useMemo(() => {
    if (visible) setSelected(new Set(defaultSelected));
  }, [visible, defaultSelected]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirm() {
    if (selected.size === 0) {
      onClose();
      return;
    }
    setPausing(true);
    try {
      for (const id of selected) {
        await pauseHabit(id);
      }
      recordBreakTaken();
      onBreakTaken?.(selected.size);
      onClose();
    } finally {
      setPausing(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>🌙 PRENDRE UNE PAUSE</Text>
          <Text style={styles.intro}>
            Choisis les habitudes à mettre en pause. Tu pourras les reprendre quand tu seras prêt.
          </Text>

          {scored.length === 0 ? (
            <Text style={styles.empty}>Aucune habitude active à mettre en pause.</Text>
          ) : (
            <ScrollView style={styles.list} contentContainerStyle={{ gap: spacing.xs }}>
              {scored.map((h) => {
                const isSelected = selected.has(h.id);
                return (
                  <Pressable
                    key={h.id}
                    style={[styles.row, isSelected && styles.rowSelected]}
                    onPress={() => toggle(h.id)}
                  >
                    <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                      {isSelected && <Text style={styles.checkboxMark}>✓</Text>}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.rowName} numberOfLines={1}>
                        {h.name}
                      </Text>
                      <Text style={styles.rowStats}>
                        Cette semaine : {h.weeklyDone}/{h.weeklyTarget}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.buttons}>
            <Pressable style={[styles.btn, styles.btnCancel]} onPress={onClose} disabled={pausing}>
              <Text style={styles.btnText}>Annuler</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnConfirm, selected.size === 0 && styles.btnDisabled]}
              onPress={handleConfirm}
              disabled={pausing || selected.size === 0}
            >
              <Text style={styles.btnTextConfirm}>
                {pausing
                  ? 'Mise en pause…'
                  : selected.size === 0
                  ? 'Sélectionne au moins 1'
                  : `Pauser ${selected.size}`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles() {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: '#000000aa',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
    },
    box: {
      backgroundColor: colors.surface,
      borderWidth: 3,
      borderColor: colors.primary,
      borderBottomWidth: 5,
      borderRadius: 4,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 400,
      maxHeight: '85%',
      gap: spacing.md,
    },
    title: {
      fontSize: fontSizes.md,
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 2,
      textAlign: 'center',
    },
    intro: {
      fontSize: fontSizes.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 18,
    },
    list: { maxHeight: 280 },
    empty: {
      fontSize: fontSizes.sm,
      color: colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.lg,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      backgroundColor: colors.background,
    },
    rowSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '15',
    },
    checkbox: {
      width: 18,
      height: 18,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxOn: {
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    checkboxMark: {
      color: colors.background,
      fontSize: 12,
      fontWeight: 'bold',
    },
    rowText: { flex: 1 },
    rowName: { fontSize: fontSizes.sm, fontWeight: 'bold', color: colors.text },
    rowStats: { fontSize: 10, color: colors.textMuted, letterSpacing: 0.5 },
    buttons: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    btn: {
      flex: 1,
      borderWidth: 2,
      borderBottomWidth: 4,
      borderRadius: 4,
      paddingVertical: spacing.sm,
      alignItems: 'center',
    },
    btnCancel: {
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    btnConfirm: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '22',
    },
    btnDisabled: {
      opacity: 0.5,
    },
    btnText: {
      fontSize: fontSizes.sm,
      fontWeight: 'bold',
      color: colors.textMuted,
      letterSpacing: 1,
    },
    btnTextConfirm: {
      fontSize: fontSizes.sm,
      fontWeight: 'bold',
      color: colors.primary,
      letterSpacing: 1,
    },
  });
}

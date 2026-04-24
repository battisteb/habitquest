import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { sessionsStore$, markSessionCompleted } from '../../src/features/training/stores/sessions-store';
import { completeHabit, habitsStore$ } from '../../src/features/habits/stores/habits-store';
import { colors, spacing, fontSizes, borderRadius } from '../../src/ui/theme/tokens';
import type { Exercise } from '../../src/features/training/types/session';
import { useTheme } from '../../src/ui/theme/theme-context';

// ─── Timer hook ───────────────────────────────────────────────────────────────
function useCountdown(initial: number, onDone: () => void) {
  const [remaining, setRemaining] = useState(initial);
  const [running, setRunning] = useState(false);
  const ref = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (ref.current) { clearInterval(ref.current); ref.current = null; }
  }, []);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!running) { stop(); return; }
    ref.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          stop();
          setRunning(false);
          if (Platform.OS !== 'web') Vibration.vibrate([0, 150, 100, 150]);
          onDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return stop;
  }, [running, stop]);

  return {
    remaining,
    running,
    start: () => { setRemaining(initial); setRunning(true); },
    pause: () => setRunning(false),
    resume: () => setRunning(true),
    reset: () => { stop(); setRunning(false); setRemaining(initial); },
  };
}

function fmt(s: number) {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Exercise step component ──────────────────────────────────────────────────
function ExerciseStep({
  exercise,
  index,
  total,
  isActive,
  isDone,
  onDone,
}: {
  exercise: Exercise;
  index: number;
  total: number;
  isActive: boolean;
  isDone: boolean;
  onDone: () => void;
}) {
  const styles = createStyles();
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState<'work' | 'rest' | 'done'>('work');
  const [setsCompleted, setSetsCompleted] = useState(0);
  const isTimer = exercise.type === 'timer';

  const handleTimerDone = useCallback(() => {
    const next = setsCompleted + 1;
    setSetsCompleted(next);
    if (next >= exercise.sets) {
      setPhase('done');
      onDone();
    } else {
      setPhase('rest');
    }
  }, [setsCompleted, exercise.sets, onDone]);

  const restTimer = useCountdown(exercise.rest || 30, () => {
    setPhase('work');
    setCurrentSet((s) => s + 1);
  });

  const workTimer = useCountdown(
    exercise.type === 'timer' ? exercise.duration : 0,
    handleTimerDone,
  );

  if (!isActive) {
    return (
      <View style={[styles.stepCard, isDone && styles.stepCardDone]}>
        <Text style={[styles.stepIndex, isDone && styles.stepIndexDone]}>
          {isDone ? '✓' : index + 1}
        </Text>
        <View style={styles.stepInfo}>
          <Text style={[styles.stepName, isDone && styles.stepNameDone]}>{exercise.name}</Text>
          <Text style={styles.stepMeta}>
            {exercise.sets} × {exercise.type === 'reps' ? `${exercise.reps} reps` : fmt(exercise.duration)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.activeStep}>
      <Text style={styles.activeStepProgress}>{index + 1} / {total}</Text>
      <Text style={styles.activeStepName}>{exercise.name}</Text>
      <Text style={styles.activeStepMeta}>
        Set {currentSet} of {exercise.sets}
        {exercise.notes ? `  ·  ${exercise.notes}` : ''}
      </Text>

      {phase === 'work' && (
        <>
          {isTimer ? (
            <View style={styles.timerBlock}>
              <Text style={styles.bigTime}>{fmt(workTimer.remaining)}</Text>
              <Text style={styles.timerLabel}>/ {fmt(exercise.duration)}</Text>
              <View style={styles.timerButtons}>
                {!workTimer.running ? (
                  <Pressable style={styles.actionBtn} onPress={workTimer.start}>
                    <Text style={styles.actionBtnText}>START</Text>
                  </Pressable>
                ) : (
                  <Pressable style={styles.actionBtn} onPress={workTimer.pause}>
                    <Text style={styles.actionBtnText}>PAUSE</Text>
                  </Pressable>
                )}
                <Pressable style={styles.skipBtn} onPress={handleTimerDone}>
                  <Text style={styles.skipBtnText}>SKIP ›</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.repsBlock}>
              <Text style={styles.repsCount}>{(exercise as { reps: number }).reps}</Text>
              <Text style={styles.repsLabel}>REPS</Text>
              <Pressable style={styles.actionBtn} onPress={handleTimerDone}>
                <Text style={styles.actionBtnText}>DONE ✓</Text>
              </Pressable>
            </View>
          )}
        </>
      )}

      {phase === 'rest' && (
        <View style={styles.restBlock}>
          <Text style={styles.restTitle}>REST</Text>
          <Text style={styles.bigTime}>{fmt(restTimer.remaining)}</Text>
          <Pressable style={styles.skipBtn} onPress={() => {
            restTimer.reset();
            setPhase('work');
            setCurrentSet((s) => s + 1);
          }}>
            <Text style={styles.skipBtnText}>SKIP REST ›</Text>
          </Pressable>
          {!restTimer.running && <Pressable style={styles.actionBtn} onPress={restTimer.start}>
            <Text style={styles.actionBtnText}>START REST</Text>
          </Pressable>}
        </View>
      )}

      {phase === 'done' && (
        <View style={styles.exerciseDone}>
          <Text style={styles.exerciseDoneText}>Exercise complete!</Text>
        </View>
      )}
    </View>
  );
}

// ─── Session player screen ────────────────────────────────────────────────────
export default function SessionPlayerScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sessions = use$(sessionsStore$.sessions);
  const habits = use$(habitsStore$.habits);

  const session = sessions.find((s) => s.id === id);
  const [activeIndex, setActiveIndex] = useState(0);
  const [completedIndices, setCompletedIndices] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const [linkedHabitId, setLinkedHabitId] = useState<string | null>(null);

  const exercises = session?.data.exercises ?? [];
  const allDone = completedIndices.size >= exercises.length;

  useEffect(() => {
    if (allDone && exercises.length > 0) {
      setFinished(true);
    }
  }, [allDone, exercises.length]);

  if (!session) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Session not found.</Text>
      </View>
    );
  }

  function handleExerciseDone() {
    const next = new Set(completedIndices);
    next.add(activeIndex);
    setCompletedIndices(next);
    if (activeIndex + 1 < exercises.length) {
      setActiveIndex(activeIndex + 1);
    }
  }

  async function handleFinish() {
    markSessionCompleted(session!.id);
    if (linkedHabitId) {
      await completeHabit(linkedHabitId).catch(() => {});
    }
    router.back();
  }

  const fitHabits = habits.filter(
    (h) => h.category === (session.data.category ?? 'fitness'),
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => {
          Alert.alert('Quit session?', 'Progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Quit', style: 'destructive', onPress: () => router.back() },
          ]);
        }}>
          <Text style={styles.backText}>✕</Text>
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.sessionTitle} numberOfLines={1}>{session.data.title}</Text>
          <Text style={styles.sessionProgress}>
            {completedIndices.size}/{exercises.length} exercises
          </Text>
        </View>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!finished ? (
          <>
            {exercises.map((ex, i) => (
              <ExerciseStep
                key={i}
                exercise={ex}
                index={i}
                total={exercises.length}
                isActive={i === activeIndex && !completedIndices.has(i)}
                isDone={completedIndices.has(i)}
                onDone={handleExerciseDone}
              />
            ))}
          </>
        ) : (
          <View style={styles.finishScreen}>
            <Text style={styles.finishEmoji}>🏆</Text>
            <Text style={styles.finishTitle}>SESSION COMPLETE!</Text>
            <Text style={styles.finishSubtitle}>{session.data.title}</Text>
            <Text style={styles.finishStats}>
              {exercises.length} exercises · #{session.completedCount + 1} completed
            </Text>

            {/* Optional: link to a habit for XP */}
            {fitHabits.length > 0 && (
              <View style={styles.habitLink}>
                <Text style={styles.habitLinkLabel}>AWARD XP TO A HABIT?</Text>
                <View style={styles.habitLinkRow}>
                  {fitHabits.slice(0, 3).map((h) => (
                    <Pressable
                      key={h.id}
                      style={[
                        styles.habitChip,
                        linkedHabitId === h.id && styles.habitChipSelected,
                      ]}
                      onPress={() => setLinkedHabitId(linkedHabitId === h.id ? null : h.id)}
                    >
                      <Text style={styles.habitChipText} numberOfLines={1}>{h.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            <Pressable style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>
                {linkedHabitId ? 'FINISH & EARN XP' : 'FINISH'}
              </Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  errorText: { color: colors.textMuted, padding: spacing.lg, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  backText: { color: colors.textMuted, fontSize: fontSizes.xl, width: 32, textAlign: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  sessionTitle: { color: colors.text, fontSize: fontSizes.md, fontWeight: 'bold', letterSpacing: 1 },
  sessionProgress: { color: colors.textMuted, fontSize: fontSizes.xs },
  scroll: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  // Step cards (inactive / done)
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    opacity: 0.5,
  },
  stepCardDone: { opacity: 0.4, borderColor: colors.success },
  stepIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    textAlign: 'center',
    lineHeight: 24,
    color: colors.textMuted,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  stepIndexDone: { borderColor: colors.success, color: colors.success },
  stepInfo: { flex: 1 },
  stepName: { color: colors.text, fontSize: fontSizes.sm, fontWeight: 'bold' },
  stepNameDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  stepMeta: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 2 },
  // Active step
  activeStep: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primary,
    borderBottomWidth: 4,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  activeStepProgress: { color: colors.textMuted, fontSize: fontSizes.xs, letterSpacing: 1 },
  activeStepName: { color: colors.text, fontSize: fontSizes.xl, fontWeight: 'bold', textAlign: 'center' },
  activeStepMeta: { color: colors.textSecondary, fontSize: fontSizes.sm },
  // Timer
  timerBlock: { alignItems: 'center', gap: spacing.sm },
  bigTime: { fontSize: 52, fontWeight: 'bold', color: colors.text, letterSpacing: 4, fontVariant: ['tabular-nums'] },
  timerLabel: { color: colors.textMuted, fontSize: fontSizes.sm },
  timerButtons: { flexDirection: 'row', gap: spacing.sm },
  // Reps
  repsBlock: { alignItems: 'center', gap: spacing.sm },
  repsCount: { fontSize: 72, fontWeight: 'bold', color: colors.primary },
  repsLabel: { color: colors.textSecondary, fontSize: fontSizes.sm, fontWeight: 'bold', letterSpacing: 2 },
  // Rest
  restBlock: { alignItems: 'center', gap: spacing.sm },
  restTitle: { color: colors.accent, fontSize: fontSizes.sm, fontWeight: 'bold', letterSpacing: 2 },
  // Buttons
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
  },
  actionBtnText: { color: colors.text, fontWeight: 'bold', fontSize: fontSizes.md, letterSpacing: 2 },
  skipBtn: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
  skipBtnText: { color: colors.textMuted, fontSize: fontSizes.sm, fontWeight: 'bold' },
  exerciseDone: { alignItems: 'center' },
  exerciseDoneText: { color: colors.success, fontSize: fontSizes.md, fontWeight: 'bold' },
  // Finish screen
  finishScreen: { flex: 1, alignItems: 'center', gap: spacing.lg, paddingTop: spacing.xl },
  finishEmoji: { fontSize: 64 },
  finishTitle: { color: colors.accent, fontSize: fontSizes.xxl, fontWeight: 'bold', letterSpacing: 4 },
  finishSubtitle: { color: colors.text, fontSize: fontSizes.lg, fontWeight: 'bold' },
  finishStats: { color: colors.textSecondary, fontSize: fontSizes.sm },
  habitLink: { width: '100%', gap: spacing.sm },
  habitLinkLabel: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1, textAlign: 'center' },
  habitLinkRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', flexWrap: 'wrap' },
  habitChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  habitChipSelected: { borderColor: colors.xp, backgroundColor: colors.xp + '22' },
  habitChipText: { color: colors.text, fontSize: fontSizes.xs, fontWeight: 'bold', maxWidth: 100 },
  finishButton: {
    backgroundColor: colors.success,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: '#2ea87a',
    borderBottomWidth: 4,
    marginTop: spacing.md,
  },
  finishButtonText: { color: colors.text, fontWeight: 'bold', fontSize: fontSizes.md, letterSpacing: 2 },
});
}

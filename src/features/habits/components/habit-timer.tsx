import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Vibration, Platform } from 'react-native';
import { colors, spacing, fontSizes, borderRadius } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';

interface HabitTimerProps {
  duration: number; // seconds
  label: string;
  onComplete: () => void;
}

type TimerState = 'idle' | 'running' | 'paused' | 'done';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function vibrate() {
  if (Platform.OS !== 'web') {
    Vibration.vibrate([0, 200, 100, 200]);
  }
}

export function HabitTimer({ duration, label, onComplete }: HabitTimerProps) {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  label: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringOuter: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringTrack: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
  },
  ringProgress: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  ringInner: {
    alignItems: 'center',
    gap: 2,
  },
  timeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timeTextDone: {
    color: colors.success,
  },
  totalTime: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  mainButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.primaryDark,
    borderBottomWidth: 4,
  },
  mainButtonDone: {
    backgroundColor: colors.success,
    borderColor: '#2ea87a',
  },
  mainButtonText: {
    color: colors.text,
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  resetButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: colors.textSecondary,
    fontSize: fontSizes.xl,
  },
  doneHint: {
    color: colors.success,
    fontSize: fontSizes.xs,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 240,
  },
}), [themeKey]);
  const [remaining, setRemaining] = useState(duration);
  const [state, setState] = useState<TimerState>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = 1 - remaining / duration;
  const circumference = 2 * Math.PI * 54; // radius 54

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stop; // cleanup on unmount
  }, [stop]);

  function start() {
    if (state === 'done') {
      setRemaining(duration);
      setState('running');
    } else {
      setState('running');
    }
  }

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r <= 1) {
            stop();
            setState('done');
            vibrate();
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    } else {
      stop();
    }
    return stop;
  }, [state, stop]);

  function handleMainPress() {
    if (state === 'idle' || state === 'paused') {
      start();
    } else if (state === 'running') {
      setState('paused');
    } else if (state === 'done') {
      onComplete();
    }
  }

  function handleReset() {
    stop();
    setRemaining(duration);
    setState('idle');
  }

  const buttonLabel =
    state === 'idle' ? T.timer_start :
    state === 'running' ? T.timer_pause :
    state === 'paused' ? T.timer_resume :
    T.timer_complete;

  const ringColor =
    state === 'done' ? colors.success :
    state === 'running' ? colors.primary :
    colors.border;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      {/* Ring progress indicator */}
      <View style={styles.ringContainer}>
        <View style={styles.ringOuter}>
          {/* Background ring */}
          <View style={[styles.ringTrack, { borderColor: colors.border }]} />
          {/* Progress overlay using border trick */}
          <View
            style={[
              styles.ringProgress,
              {
                borderColor: ringColor,
                transform: [{ rotate: `${progress * 360 - 90}deg` }],
                opacity: progress > 0 ? 1 : 0,
              },
            ]}
          />
          {/* Time display */}
          <View style={styles.ringInner}>
            <Text style={[styles.timeText, state === 'done' && styles.timeTextDone]}>
              {state === 'done' ? '00:00' : formatTime(remaining)}
            </Text>
            <Text style={styles.totalTime}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={[styles.mainButton, state === 'done' && styles.mainButtonDone]}
          onPress={handleMainPress}
        >
          <Text style={styles.mainButtonText}>{buttonLabel}</Text>
        </Pressable>
        {state !== 'idle' && state !== 'done' && (
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>↺</Text>
          </Pressable>
        )}
      </View>

      {state === 'done' && (
        <Text style={styles.doneHint}>{T.timer_done_hint}</Text>
      )}
    </View>
  );
}



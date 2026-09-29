import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, type LayoutChangeEvent } from 'react-native';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { habitsStore$ } from '../../habits/stores/habits-store';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  requestPermissions,
  applyNotificationPrefs,
} from '../../notifications/utils/notification-service';
import { tutorialSeen$, markTutorialSeen } from '../tutorial-state';
import { tourTargets$, tourEvent$, measureTarget, type Rect, type TourTargetKey } from '../tour/tour-targets';
import { TOUR_STEPS, REMINDER_HOURS, DEFAULT_REMINDER_HOUR, type TourStep } from '../tour/tour-steps';

const HOLE_PADDING = 6;
const GAP = 14;
const MISSING_TARGET_DELAY_MS = 1500;

/**
 * Guided first-run tour of the Today screen. A bubble moves from element to
 * element; action steps only move on once the player has done the action
 * (validate a quest, open the missions). Ends with focus mode and the daily
 * reminder question.
 */
export function TodayTutorial() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const seen = use$(tutorialSeen$);
  const targets = use$(tourTargets$);
  const event = use$(tourEvent$);
  const completions = use$(habitsStore$.todayCompletions);
  const doneCount = Object.values(completions ?? {}).filter(Boolean).length;

  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [bubbleHeight, setBubbleHeight] = useState(0);
  const [hour, setHour] = useState(DEFAULT_REMINDER_HOUR);
  const stepStart = useRef({ at: Date.now(), done: doneCount });
  const rootRef = useRef<View | null>(null);
  const top = useRef(new Animated.Value(0)).current;
  const bounce = useRef(new Animated.Value(0)).current;

  const step: TourStep | undefined = TOUR_STEPS[index];
  const target = step?.target ? targets[step.target] : undefined;

  const next = () => setIndex((i) => i + 1);
  const finish = () => {
    setIndex(0);
    markTutorialSeen();
  };

  // New step: remember where we start from, keep positions fresh (the list
  // animates and scrolls), and skip a step whose element is not on screen.
  useEffect(() => {
    if (seen || !step) return;
    stepStart.current = { at: Date.now(), done: doneCount };
    const key = step.target;
    if (!key) return;
    const measure = () => {
      measureTarget(key as TourTargetKey);
      rootRef.current?.measureInWindow((x, y, width, height) => setOrigin({ x, y, width, height }));
    };
    measure();
    const timer = setInterval(measure, 400);
    const skip = setTimeout(() => {
      if (!tourTargets$[key as TourTargetKey].get()) next();
    }, MISSING_TARGET_DELAY_MS);
    return () => {
      clearInterval(timer);
      clearTimeout(skip);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, seen]);

  // Action steps: move on once the player did it.
  useEffect(() => {
    if (!step) return;
    if (step.advance === 'completion' && doneCount > stepStart.current.done) next();
    if (step.advance === 'missions' && event?.name === 'missions_toggled' && event.at > stepStart.current.at) next();
  }, [doneCount, event, step]);

  // The arrow bobs to draw the eye.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bounce, { toValue: 6, duration: 450, useNativeDriver: false }),
        Animated.timing(bounce, { toValue: 0, duration: 450, useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [bounce]);

  const hole: Rect | null = target
    ? {
        x: target.x - origin.x - HOLE_PADDING,
        y: target.y - origin.y - HOLE_PADDING,
        width: target.width + HOLE_PADDING * 2,
        height: target.height + HOLE_PADDING * 2,
      }
    : null;
  const below = hole ? hole.y + hole.height / 2 < origin.height * 0.55 : false;
  const bubbleTop = hole
    ? below
      ? hole.y + hole.height + GAP
      : hole.y - GAP - bubbleHeight
    : Math.max(spacing.lg, (origin.height - bubbleHeight) / 2);

  // The bubble glides to its new place.
  useEffect(() => {
    Animated.spring(top, { toValue: bubbleTop, useNativeDriver: false, friction: 8 }).start();
  }, [bubbleTop, top]);

  if (seen || !step) return null;

  const onRootLayout = () =>
    rootRef.current?.measureInWindow((x, y, width, height) => setOrigin({ x, y, width, height }));
  const onBubbleLayout = (e: LayoutChangeEvent) => setBubbleHeight(e.nativeEvent.layout.height);

  const answerReminder = (wanted: boolean) => {
    saveNotificationPrefs({
      ...getNotificationPrefs(),
      dailyReminderEnabled: wanted,
      dailyReminderHour: hour,
      dailyReminderMinute: 0,
    });
    if (wanted) {
      requestPermissions()
        .then((granted) => { if (granted) applyNotificationPrefs(); })
        .catch(() => {});
    } else {
      applyNotificationPrefs();
    }
    finish();
  };

  const dim = styles.dim;
  const arrowLeft = hole ? Math.min(Math.max(hole.x + hole.width / 2 - spacing.md - 8, 8), origin.width - spacing.md * 2 - 24) : 0;

  return (
    <View ref={rootRef} style={StyleSheet.absoluteFill} pointerEvents="box-none" onLayout={onRootLayout} testID="tour">
      {/* Dimmed screen with a hole on the target: the target stays tappable. */}
      {hole ? (
        <>
          <View style={[dim, { top: 0, left: 0, right: 0, height: Math.max(hole.y, 0) }]} />
          <View style={[dim, { top: hole.y + hole.height, left: 0, right: 0, bottom: 0 }]} />
          <View style={[dim, { top: hole.y, left: 0, width: Math.max(hole.x, 0), height: hole.height }]} />
          <View style={[dim, { top: hole.y, left: hole.x + hole.width, right: 0, height: hole.height }]} />
          <View pointerEvents="none" style={[styles.ring, { top: hole.y, left: hole.x, width: hole.width, height: hole.height }]} />
        </>
      ) : (
        <View style={[dim, StyleSheet.absoluteFill]} />
      )}

      <Animated.View style={[styles.bubbleWrap, { top }]} onLayout={onBubbleLayout}>
        {hole && below && (
          <Animated.Text style={[styles.arrow, { marginLeft: arrowLeft, transform: [{ translateY: Animated.multiply(bounce, -1) }] }]}>▲</Animated.Text>
        )}
        <PixelFrame borderColor={colors.text} backgroundColor={colors.text} contentStyle={styles.bubble}>
          <Text style={styles.counter}>{index + 1} / {TOUR_STEPS.length}</Text>
          <Text style={styles.title}>{T[step.title]}</Text>
          <Text style={styles.body}>{T[step.body]}</Text>

          {step.advance === 'reminder' ? (
            <>
              <Text style={styles.small}>{T.tuto_notif_time}</Text>
              <View style={styles.hours}>
                {REMINDER_HOURS.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => setHour(h)}
                    style={[styles.hour, h === hour && styles.hourActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: h === hour }}
                  >
                    <Text style={[styles.hourText, h === hour && styles.hourTextActive]}>{h}h</Text>
                  </Pressable>
                ))}
              </View>
              <PixelButton title={T.tuto_notif_yes} onPress={() => answerReminder(true)} />
              <Pressable onPress={() => answerReminder(false)} accessibilityRole="button">
                <Text style={styles.link}>{T.tuto_notif_no}</Text>
              </Pressable>
            </>
          ) : step.advance === 'next' ? (
            <PixelButton title={T.tuto_next} onPress={next} />
          ) : step.advance === 'completion' ? (
            <Pressable onPress={next} accessibilityRole="button">
              <Text style={styles.link}>{T.tuto_complete_later}</Text>
            </Pressable>
          ) : null}

          {step.advance !== 'reminder' && (
            <Pressable onPress={finish} accessibilityRole="button">
              <Text style={styles.link}>{T.tuto_skip}</Text>
            </Pressable>
          )}
        </PixelFrame>
        {hole && !below && (
          <Animated.Text style={[styles.arrow, { marginLeft: arrowLeft, transform: [{ translateY: bounce }] }]}>▼</Animated.Text>
        )}
      </Animated.View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.65)' },
    ring: { position: 'absolute', borderWidth: 3, borderColor: colors.accent },
    bubbleWrap: { position: 'absolute', left: spacing.md, right: spacing.md },
    bubble: { padding: spacing.md, gap: spacing.sm },
    arrow: { color: colors.text, fontSize: 20, lineHeight: 22 },
    counter: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.surface, letterSpacing: 1 },
    title: { fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold, color: colors.background },
    body: { fontSize: fontSizes.sm, color: colors.background, lineHeight: 19 },
    small: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.background, letterSpacing: 1 },
    hours: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
    hour: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, borderWidth: 2, borderColor: colors.surfaceLight },
    hourActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    hourText: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.background },
    hourTextActive: { color: colors.text },
    link: { fontSize: fontSizes.xs, color: colors.surface, textDecorationLine: 'underline', textAlign: 'center', paddingVertical: spacing.xs },
  });
}

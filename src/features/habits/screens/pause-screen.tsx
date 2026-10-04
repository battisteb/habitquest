import { goBack } from '../../../lib/navigation';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { habitsStore$, pauseHabit, resumeHabit, getWeeklyTarget } from '../stores/habits-store';
import { recordBreakTaken } from '../stores/burnout-store';
import { activateFreeze, getFreezesRemaining, isFreezeActiveToday } from '../utils/streak-freeze';
import { pauseSuggestions, PAUSE_PRESETS, type PausePreset } from '../utils/pause';
import { profileStore$, refreshProfile } from '../../gamification/stores/profile-store';
import { authStore$ } from '../../auth/stores/auth-store';
import { getMaxFreezeTokens } from '../../monetization/utils/feature-gates';
import { shouldShowAds, showRewardedInterstitial } from '../../monetization/utils/ad-service';
import { supabase } from '../../../lib/supabase/client';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { useT } from '../../../lib/i18n';
import { categoryLabel } from '../../../lib/i18n/labels';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';

/**
 * One place to take a break (D3), and every choice protects the streaks on
 * the server: a freeze for today, some quests paused, or all of them.
 * Opened from Settings, from the "quests paused" banner and by the burnout
 * banner (?suggest=1 preselects the two quests that weigh the most).
 */
export default function PauseScreen() {
  const T = useT();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const { suggest } = useLocalSearchParams<{ suggest?: string }>();

  const habits = use$(habitsStore$.habits).filter((h) => !h.is_archived);
  const weekCompletions = use$(habitsStore$.weekCompletions);
  const profile = use$(profileStore$.profile);
  const active = habits.filter((h) => !h.is_paused);
  const paused = habits.filter((h) => h.is_paused);

  const [selected, setSelected] = useState<Set<string>>(() =>
    suggest ? new Set(pauseSuggestions(active, weekCompletions, getWeeklyTarget)) : new Set(),
  );
  const [busy, setBusy] = useState(false);
  const [freezeActive, setFreezeActive] = useState(isFreezeActiveToday());
  const [freezesLeft, setFreezesLeft] = useState(getFreezesRemaining());
  const canEarnFreeze =
    shouldShowAds() && freezesLeft === 0 && !freezeActive && (profile?.freeze_tokens ?? 0) < getMaxFreezeTokens();

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const applyPreset = (preset: PausePreset) =>
    setSelected(new Set(active.filter((h) => (PAUSE_PRESETS[preset] as readonly string[]).includes(h.category)).map((h) => h.id)));

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      Alert.alert(T.common_error, T.pause_error);
    } finally {
      setBusy(false);
    }
  };

  const pauseSelected = () =>
    run(async () => {
      const ids = [...selected];
      for (const id of ids) await pauseHabit(id);
      setSelected(new Set());
      if (suggest) recordBreakTaken();
      Alert.alert(T.pause_done_title, T.pause_done_msg.replace('{n}', String(ids.length)));
    });

  const pauseAll = () =>
    Alert.alert(T.pause_all_confirm_title, T.pause_all_confirm_msg, [
      { text: T.common_cancel, style: 'cancel' },
      {
        text: T.pause_all_btn,
        onPress: () =>
          run(async () => {
            for (const h of active) await pauseHabit(h.id);
            recordBreakTaken();
          }),
      },
    ]);

  const resumeAll = () => run(async () => {
    for (const h of paused) await resumeHabit(h.id);
  });

  const applyFreeze = () =>
    Alert.alert(T.today_freeze_alert_title, T.today_freeze_alert_msg, [
      { text: T.today_freeze_alert_cancel, style: 'cancel' },
      {
        text: T.today_freeze_alert_confirm,
        onPress: async () => {
          if (await activateFreeze()) {
            setFreezeActive(true);
            setFreezesLeft(getFreezesRemaining());
          } else {
            Alert.alert(T.today_freeze_error_title, T.today_freeze_error_msg);
          }
        },
      },
    ]);

  const earnFreeze = () => {
    const userId = authStore$.user.get()?.id;
    if (!userId) return;
    showRewardedInterstitial(async () => {
      const { error } = await supabase.rpc('add_freeze_token' as never, { p_user_id: userId } as never);
      if (error) {
        Alert.alert(T.today_freeze_error_title, T.today_freeze_error_msg);
      } else {
        setFreezesLeft((n) => n + 1);
        refreshProfile();
      }
    });
  };

  return (
    <ScrollView
      style={[styles.screen, { paddingTop: insets.top }]}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
    >
      <PixelButton title={T.common_back} onPress={() => goBack(router, '/settings')} variant="ghost" style={styles.back} />
      <Text style={styles.title}>{T.pause_title}</Text>
      <Text style={styles.intro}>{T.pause_intro}</Text>

      {/* 1. Just today: a freeze covers every streak. */}
      <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
        <Text style={styles.cardTitle}>{T.pause_today_title}</Text>
        <Text style={styles.cardText}>{T.pause_today_desc}</Text>
        {freezeActive ? (
          <PixelButton title={T.pause_today_covered} onPress={() => {}} disabled variant="secondary" />
        ) : freezesLeft > 0 ? (
          <PixelButton title={T.pause_today_use.replace('{n}', String(freezesLeft))} onPress={applyFreeze} testID="pause-freeze" />
        ) : canEarnFreeze ? (
          <PixelButton title={T.today_watch_ad} onPress={earnFreeze} variant="secondary" />
        ) : (
          <Text style={styles.muted}>{T.pause_today_none}</Text>
        )}
      </PixelFrame>

      {/* 2. Some quests, for as long as needed. */}
      <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
        <Text style={styles.cardTitle}>{T.pause_some_title}</Text>
        <Text style={styles.cardText}>{T.pause_some_desc}</Text>
        <View style={styles.presets}>
          {(Object.keys(PAUSE_PRESETS) as PausePreset[]).map((p) => (
            <Pressable key={p} style={styles.chip} onPress={() => applyPreset(p)} accessibilityRole="button" testID={`pause-preset-${p}`}>
              <Text style={styles.chipText}>{T[`pause_preset_${p}`]}</Text>
            </Pressable>
          ))}
        </View>
        {active.map((h) => {
          const on = selected.has(h.id);
          return (
            <Pressable
              key={h.id}
              style={[styles.row, on && styles.rowOn]}
              onPress={() => toggle(h.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              testID={`pause-pick-${h.id}`}
            >
              <Text style={styles.check}>{on ? '☑' : '☐'}</Text>
              <Text style={styles.rowName} numberOfLines={1}>{h.name}</Text>
              <Text style={styles.rowCat}>{categoryLabel(T, h.category)}</Text>
            </Pressable>
          );
        })}
        <PixelButton
          title={T.pause_selected_btn.replace('{n}', String(selected.size))}
          onPress={pauseSelected}
          disabled={busy || selected.size === 0}
          testID="pause-selected"
        />
        {paused.length > 0 && (
          <View style={styles.pausedList}>
            <Text style={styles.subTitle}>{T.pause_paused_title}</Text>
            {paused.map((h) => (
              <View key={h.id} style={styles.row}>
                <Text style={styles.check}>⏸</Text>
                <Text style={styles.rowName} numberOfLines={1}>{h.name}</Text>
                <Pressable onPress={() => run(() => resumeHabit(h.id))} hitSlop={6} testID={`pause-resume-${h.id}`}>
                  <Text style={styles.resume}>{T.pause_resume}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </PixelFrame>

      {/* 3. Everything (holidays, illness…). */}
      <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
        <Text style={styles.cardTitle}>{T.pause_all_title}</Text>
        <Text style={styles.cardText}>{T.pause_all_desc}</Text>
        {active.length > 0 ? (
          <PixelButton title={T.pause_all_btn} onPress={pauseAll} disabled={busy} variant="secondary" testID="pause-all" />
        ) : (
          <PixelButton title={T.pause_all_resume} onPress={resumeAll} disabled={busy || paused.length === 0} testID="resume-all" />
        )}
      </PixelFrame>
    </ScrollView>
  );
}

function createStyles() {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md },
    back: { alignSelf: 'flex-start' },
    title: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xl), letterSpacing: 2 },
    intro: { color: colors.textSecondary, fontSize: fontSizes.md, lineHeight: 22 },
    card: { padding: spacing.md, gap: spacing.sm },
    cardTitle: { color: colors.primary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md), letterSpacing: 1 },
    cardText: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 },
    muted: { color: colors.textMuted, fontSize: fontSizes.sm },
    presets: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
    chipText: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs) },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.xs, borderWidth: 2, borderColor: 'transparent' },
    rowOn: { borderColor: colors.primary, backgroundColor: colors.primary + '1a' },
    check: { color: colors.text, fontSize: fontSizes.md, width: 20 },
    rowName: { flex: 1, color: colors.text, fontSize: fontSizes.sm },
    rowCat: { color: colors.textMuted, fontSize: fontSizes.xs },
    pausedList: { gap: spacing.xs, borderTopWidth: 2, borderTopColor: colors.border, paddingTop: spacing.sm },
    subTitle: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 1 },
    resume: { color: colors.primary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs) },
  });
}

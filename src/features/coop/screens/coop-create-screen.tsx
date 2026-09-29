import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import {
  COOP,
  clampCoopTarget,
  suggestCoopTarget,
  type CoopGoal,
} from '../../../lib/constants/game-config';
import { friendsStore$, fetchFriends } from '../../social/stores/friends-store';
import { createCoopChallenge, CoopLimitError } from '../api';

const GOALS: CoopGoal[] = ['validations', 'xp'];

export default function CoopCreateScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const friendships = use$(friendsStore$.friends);
  const [selected, setSelected] = useState<string[]>([]);
  const [goal, setGoal] = useState<CoopGoal>('validations');
  const [days, setDays] = useState<number>(7);
  const [target, setTarget] = useState(() => suggestCoopTarget('validations', 2, 7));
  // Until the player touches the target, it follows the team size and duration.
  const [targetEdited, setTargetEdited] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void fetchFriends();
  }, []);

  useEffect(() => {
    if (!targetEdited) setTarget(suggestCoopTarget(goal, selected.length + 1, days));
  }, [goal, days, selected.length, targetEdited]);

  const friends = friendships.map((f) => f.profile).filter(Boolean);
  const step = goal === 'xp' ? 50 : 5;

  const toggleFriend = (id: string) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < COOP.MAX_FRIENDS
          ? [...prev, id]
          : prev,
    );
  };

  const changeTarget = (delta: number) => {
    setTargetEdited(true);
    setTarget((t) => clampCoopTarget(goal, t + delta));
  };

  const changeGoal = (g: CoopGoal) => {
    setGoal(g);
    setTargetEdited(false);
  };

  const submit = async () => {
    setSending(true);
    try {
      await createCoopChallenge(selected, goal, target, days);
      // Opened from a link there is no list behind this screen.
      if (router.canGoBack()) router.back();
      else router.replace('/coop');
    } catch (e) {
      if (e instanceof CoopLimitError) {
        Alert.alert(T.coop_limit_title, T.coop_limit_body, [
          { text: T.coop_limit_ok, style: 'cancel' },
          { text: T.coop_limit_premium, onPress: () => router.push('/paywall') },
        ]);
      } else {
        Alert.alert(T.coop_create_error);
      }
    } finally {
      setSending(false);
    }
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
    back: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 1 },
    title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
    label: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 2 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    chipText: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary },
    chipTextOn: { color: colors.text },
    empty: { fontSize: fontSizes.sm, color: colors.textMuted, lineHeight: 20 },
    stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
    stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    stepText: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text },
    targetValue: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.accent, minWidth: 120, textAlign: 'center' },
    summary: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
  }), [themeKey]);

  const chip = (key: string, label: string, on: boolean, onPress: () => void, testID?: string) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} testID={testID}>
      {({ pressed }) => (
        <PixelFrame
          pressed={pressed}
          borderColor={on ? colors.primary : colors.border}
          backgroundColor={on ? colors.primary + '33' : colors.surface}
          contentStyle={styles.chip}
        >
          <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
        </PixelFrame>
      )}
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>{T.coop_back}</Text>
        </Pressable>
        <Text style={styles.title}>{T.coop_create_title}</Text>

        <Text style={styles.label}>{T.coop_create_friends}</Text>
        {friends.length === 0 ? (
          <Text style={styles.empty}>{T.coop_create_no_friends}</Text>
        ) : (
          <View style={styles.chips}>
            {friends.map((p) =>
              chip(p.id, p.username, selected.includes(p.id), () => toggleFriend(p.id), `coop-friend-${p.username}`),
            )}
          </View>
        )}

        <Text style={styles.label}>{T.coop_create_goal}</Text>
        <View style={styles.chips}>
          {GOALS.map((g) =>
            chip(g, g === 'xp' ? T.coop_goal_type_xp : T.coop_goal_type_validations, goal === g, () => changeGoal(g), `coop-goal-${g}`),
          )}
        </View>

        <Text style={styles.label}>{T.coop_create_duration}</Text>
        <View style={styles.chips}>
          {COOP.DURATIONS.map((d) =>
            chip(String(d), T.coop_duration.replace('{n}', String(d)), days === d, () => setDays(d), `coop-days-${d}`),
          )}
        </View>

        <Text style={styles.label}>{T.coop_create_target}</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => changeTarget(-step)} accessibilityLabel={T.coop_create_less} style={styles.stepBtn}>
            <Text style={styles.stepText}>−</Text>
          </Pressable>
          <Text style={styles.targetValue} testID="coop-target">
            {(goal === 'xp' ? T.coop_goal_xp : T.coop_goal_validations).replace('{n}', String(target))}
          </Text>
          <Pressable onPress={() => changeTarget(step)} accessibilityLabel={T.coop_create_more} style={styles.stepBtn}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.summary}>{T.coop_create_summary}</Text>
        <PixelButton
          title={T.coop_create_submit}
          onPress={submit}
          disabled={selected.length < COOP.MIN_FRIENDS || sending}
        />
      </ScrollView>
    </View>
  );
}

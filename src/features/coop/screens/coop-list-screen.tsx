import { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { PixelProgress } from '../../../ui/components/pixel-progress';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import {
  fetchCoopChallenges,
  respondCoopChallenge,
  cancelCoopChallenge,
  CoopLimitError,
} from '../api';
import type { CoopChallenge } from '../types';
import { coopProgressRatio, coopDaysLeft } from '../utils/coop-display';

function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), text);
}

export default function CoopListScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [challenges, setChallenges] = useState<CoopChallenge[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setChallenges(await fetchCoopChallenges());
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  // Reload when coming back from the create screen.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const showLimit = () =>
    Alert.alert(T.coop_limit_title, T.coop_limit_body, [
      { text: T.coop_limit_ok, style: 'cancel' },
      { text: T.coop_limit_premium, onPress: () => router.push('/paywall') },
    ]);

  const act = async (action: () => Promise<void>) => {
    try {
      await action();
    } catch (e) {
      if (e instanceof CoopLimitError) showLimit();
      else Alert.alert(T.coop_error);
    }
    await load();
  };

  const statusColor: Record<CoopChallenge['status'], string> = {
    pending: colors.accent,
    active: colors.success,
    completed: colors.accent,
    failed: colors.textMuted,
    cancelled: colors.textMuted,
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
    back: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 1 },
    title: { fontSize: pixelSize(fontSizes.xxl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
    card: { padding: spacing.md, gap: spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    status: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 2 },
    meta: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textMuted },
    goal: { fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold, color: colors.text },
    progressText: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary, textAlign: 'right' },
    member: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    memberName: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    memberMe: { color: colors.primary },
    memberStat: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary },
    memberWaiting: { fontSize: fontSizes.xs, color: colors.textMuted, fontStyle: 'italic' },
    reward: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.xp },
    invite: { fontSize: fontSizes.sm, color: colors.accent },
    actions: { flexDirection: 'row', gap: spacing.sm },
    empty: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', lineHeight: 20 },
    center: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl },
  }), [themeKey]);

  const goalText = (c: CoopChallenge) =>
    fill(c.goal === 'xp' ? T.coop_goal_xp : T.coop_goal_validations, { n: c.target });

  const renderChallenge = (c: CoopChallenge) => {
    const daysLeft = coopDaysLeft(c.ends_at);
    const done = c.status === 'completed' || c.status === 'failed' || c.status === 'cancelled';
    return (
      <PixelFrame
        key={c.id}
        testID={`coop-${c.id}`}
        borderColor={statusColor[c.status]}
        backgroundColor={colors.surface}
        contentStyle={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.status, { color: statusColor[c.status] }]}>{T[`coop_status_${c.status}`]}</Text>
          <Text style={styles.meta}>
            {c.status === 'active' && daysLeft !== null
              ? fill(T.coop_days_left, { n: daysLeft })
              : fill(T.coop_duration, { n: c.duration_days })}
          </Text>
        </View>
        <Text style={styles.goal}>{goalText(c)}</Text>
        <PixelProgress progress={coopProgressRatio(c)} color={statusColor[c.status]} />
        <Text style={styles.progressText}>{c.progress} / {c.target}</Text>

        {c.members.map((m) => (
          <View key={m.username} style={styles.member}>
            <Text style={[styles.memberName, m.is_me && styles.memberMe]} numberOfLines={1}>
              {m.username}{m.is_me ? ` (${T.coop_you})` : ''}
            </Text>
            {m.status === 'invited' ? (
              <Text style={styles.memberWaiting}>{T.coop_waiting}</Text>
            ) : (
              <Text style={styles.memberStat}>
                {c.goal === 'xp' ? `${m.xp} XP` : `${m.validations} ✓`}
              </Text>
            )}
            {m.reward_xp !== null && m.reward_xp > 0 && (
              <Text style={styles.reward}>{fill(T.coop_reward, { n: m.reward_xp })}</Text>
            )}
          </View>
        ))}

        {!done && c.my_status === 'invited' && (
          <>
            <Text style={styles.invite}>{T.coop_invited_you}</Text>
            <View style={styles.actions}>
              <PixelButton title={T.coop_accept} onPress={() => act(() => respondCoopChallenge(c.id, true))} style={{ flex: 1 }} />
              <PixelButton title={T.coop_decline} onPress={() => act(() => respondCoopChallenge(c.id, false))} variant="ghost" style={{ flex: 1 }} />
            </View>
          </>
        )}
        {c.status === 'pending' && c.is_creator && (
          <PixelButton title={T.coop_cancel} onPress={() => act(() => cancelCoopChallenge(c.id))} variant="ghost" />
        )}
      </PixelFrame>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.back}>{T.coop_back}</Text>
        </Pressable>
        <Text style={styles.title}>{T.coop_title}</Text>
        <PixelButton title={T.coop_new} onPress={() => router.push('/coop/create')} />

        {challenges === null ? (
          <View style={styles.center}>
            {error ? (
              <>
                <Text style={styles.empty}>{T.coop_error}</Text>
                <PixelButton title={T.coop_retry} onPress={() => void load()} variant="secondary" />
              </>
            ) : (
              <ActivityIndicator color={colors.primary} />
            )}
          </View>
        ) : challenges.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.empty}>{T.coop_empty}</Text>
          </View>
        ) : (
          challenges.map(renderChallenge)
        )}
      </ScrollView>
    </View>
  );
}

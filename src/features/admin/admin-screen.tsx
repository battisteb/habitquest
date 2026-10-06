/**
 * Internal founder dashboard (web only). Reads aggregate product metrics from
 * the `admin_dashboard` RPC, which is admin-gated server-side: a non-admin gets
 * an error and sees "not authorized". No per-user personal data is shown.
 *
 * This is an internal tool, not a user-facing screen, so its copy stays in
 * English only (it is never linked from the app navigation).
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase/client';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../ui/theme/tokens';
import { PixelFrame } from '../../ui/components/pixel-frame';

type DayPoint = { day: string; n: number };
type Dashboard = {
  generated_at: string;
  users: { total: number; new_today: number; new_7d: number; premium: number; activated: number; activation_rate: number; premium_rate: number };
  active: { dau: number; wau: number; mau: number; stickiness: number; lapsed_7d: number };
  retention: { d7_cohort: number; d7_rate: number | null };
  engagement: { completions_today: number; completions_7d: number; active_streaks: number; habits_total: number; habits_archived: number; avg_completions_per_active_7d: number };
  social: { friends: number; duels: number; kudos: number; moods: number };
  funnel: { waitlist: number; support_open: number; purchases: number };
  habits_by_category: { category: string; n: number }[];
  signups_14d: DayPoint[];
  completions_14d: DayPoint[];
};

const pct = (v: number | null) => (v === null || v === undefined ? '—' : `${v}%`);

type State =
  | { status: 'loading' }
  | { status: 'denied' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: Dashboard };

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <PixelFrame style={styles.metric} backgroundColor={colors.surface}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </PixelFrame>
  );
}

function BarChart({ title, points }: { title: string; points: DayPoint[] }) {
  const max = Math.max(1, ...points.map((p) => p.n));
  return (
    <PixelFrame style={styles.chart} backgroundColor={colors.surface}>
      <Text style={styles.chartTitle}>{title}</Text>
      <View style={styles.bars}>
        {points.map((p) => (
          <View key={p.day} style={styles.barCol}>
            <Text style={styles.barValue}>{p.n > 0 ? p.n : ''}</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { height: `${(p.n / max) * 100}%` }]} />
            </View>
            <Text style={styles.barDay}>{p.day.slice(5)}</Text>
          </View>
        ))}
      </View>
    </PixelFrame>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setState({ status: 'denied' });
      return;
    }
    (async () => {
      const { data, error } = await supabase.rpc('admin_dashboard');
      if (error) {
        setState(/admin only/i.test(error.message) ? { status: 'denied' } : { status: 'error', message: error.message });
        return;
      }
      setState({ status: 'ready', data: data as unknown as Dashboard });
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>HABITQUEST · METRICS</Text>

      {state.status === 'loading' && <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: spacing.xl }} />}
      {state.status === 'denied' && <Text style={styles.muted}>Not authorized. This page is for admins only.</Text>}
      {state.status === 'error' && <Text style={styles.muted}>Could not load metrics: {state.message}</Text>}

      {state.status === 'ready' && (
        <>
          <Text style={styles.generated}>Updated {new Date(state.data.generated_at).toLocaleString()}</Text>

          <Text style={styles.section}>USERS</Text>
          <View style={styles.row}>
            <Metric label="TOTAL" value={state.data.users.total} />
            <Metric label="NEW TODAY" value={state.data.users.new_today} />
            <Metric label="NEW · 7D" value={state.data.users.new_7d} />
            <Metric label="ACTIVATED" value={`${state.data.users.activated} (${pct(state.data.users.activation_rate)})`} />
            <Metric label="PREMIUM" value={`${state.data.users.premium} (${pct(state.data.users.premium_rate)})`} />
          </View>

          <Text style={styles.section}>ACTIVE (completed a quest)</Text>
          <View style={styles.row}>
            <Metric label="DAU" value={state.data.active.dau} />
            <Metric label="WAU" value={state.data.active.wau} />
            <Metric label="MAU" value={state.data.active.mau} />
            <Metric label="STICKINESS (DAU/WAU)" value={pct(state.data.active.stickiness)} />
            <Metric label="LAPSED · 7D" value={state.data.active.lapsed_7d} />
          </View>

          <Text style={styles.section}>RETENTION</Text>
          <View style={styles.row}>
            <Metric label="D7 RETENTION" value={pct(state.data.retention.d7_rate)} />
            <Metric label="D7 COHORT (size)" value={state.data.retention.d7_cohort} />
          </View>

          <Text style={styles.section}>ENGAGEMENT</Text>
          <View style={styles.row}>
            <Metric label="COMPLETIONS · TODAY" value={state.data.engagement.completions_today} />
            <Metric label="COMPLETIONS · 7D" value={state.data.engagement.completions_7d} />
            <Metric label="AVG / ACTIVE · 7D" value={state.data.engagement.avg_completions_per_active_7d} />
            <Metric label="ACTIVE STREAKS" value={state.data.engagement.active_streaks} />
            <Metric label="HABITS" value={state.data.engagement.habits_total} />
            <Metric label="ARCHIVED HABITS" value={state.data.engagement.habits_archived} />
          </View>

          <Text style={styles.section}>SOCIAL</Text>
          <View style={styles.row}>
            <Metric label="FRIENDSHIPS" value={state.data.social.friends} />
            <Metric label="DUELS" value={state.data.social.duels} />
            <Metric label="KUDOS" value={state.data.social.kudos} />
            <Metric label="MOOD LOGS" value={state.data.social.moods} />
          </View>

          <Text style={styles.section}>FUNNEL</Text>
          <View style={styles.row}>
            <Metric label="WAITLIST" value={state.data.funnel.waitlist} />
            <Metric label="SUPPORT OPEN" value={state.data.funnel.support_open} />
            <Metric label="PURCHASES" value={state.data.funnel.purchases} />
          </View>

          <Text style={styles.section}>HABITS BY CATEGORY</Text>
          <PixelFrame style={styles.chart} backgroundColor={colors.surface}>
            {state.data.habits_by_category.length === 0 ? (
              <Text style={styles.metricLabel}>No habits yet</Text>
            ) : (
              state.data.habits_by_category.map((c) => (
                <View key={c.category} style={styles.catRow}>
                  <Text style={styles.catName}>{c.category}</Text>
                  <Text style={styles.catVal}>{c.n}</Text>
                </View>
              ))
            )}
          </PixelFrame>

          <Text style={styles.section}>LAST 14 DAYS</Text>
          <BarChart title="Signups / day" points={state.data.signups_14d} />
          <BarChart title="Completions / day" points={state.data.completions_14d} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm, maxWidth: 900, width: '100%', alignSelf: 'center' },
  title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
  generated: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, marginBottom: spacing.sm },
  muted: { color: colors.textMuted, fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, marginTop: spacing.xl, textAlign: 'center' },
  section: { color: colors.accent, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, letterSpacing: 1, marginTop: spacing.md },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexGrow: 1, flexBasis: 120, minWidth: 100 },
  metricValue: { color: colors.text, fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold },
  metricLabel: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 0.5 },
  chart: { marginTop: spacing.sm },
  chartTitle: { color: colors.text, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, marginBottom: spacing.sm },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 140 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  barValue: { color: colors.textMuted, fontSize: pixelSize(8), fontFamily: fonts.bold },
  barTrack: { width: '100%', height: 96, backgroundColor: colors.border, justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: colors.accent },
  barDay: { color: colors.textMuted, fontSize: pixelSize(8), fontFamily: fonts.bold },
  catRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  catName: { color: colors.text, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
  catVal: { color: colors.accent, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
});

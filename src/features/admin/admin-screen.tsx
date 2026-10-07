/**
 * Internal founder dashboard (web only). Reads aggregate product metrics from
 * the `admin_dashboard` and `admin_segments` RPCs, which are admin-gated
 * server-side: a non-admin gets an error and sees "not authorized". No
 * per-user personal data is shown.
 *
 * Internal tool for the founder only (never linked from the app navigation),
 * so its copy is in French, outside the i18n tables, with a short explanation
 * under every number.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase/client';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../ui/theme/tokens';
import { PixelFrame } from '../../ui/components/pixel-frame';
import { CohortTable, Funnel, SegmentTable, type Segments, type SegmentDim } from './components/segments';

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
  | { status: 'ready'; data: Dashboard; segments: Segments | null };

const DIMS: { key: SegmentDim; label: string }[] = [
  { key: 'by_language', label: 'LANGUE' },
  { key: 'by_platform', label: 'PLATEFORME' },
  { key: 'by_region', label: 'RÉGION' },
  { key: 'by_plan', label: 'OFFRE' },
];

function Metric({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <PixelFrame style={styles.metric} backgroundColor={colors.surface}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </PixelFrame>
  );
}

function Section({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.section}>{title}</Text>
      {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
    </View>
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
            <Text style={styles.barDay}>{p.day.slice(8)}/{p.day.slice(5, 7)}</Text>
          </View>
        ))}
      </View>
    </PixelFrame>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [state, setState] = useState<State>({ status: 'loading' });
  const [dim, setDim] = useState<SegmentDim>('by_language');

  useEffect(() => {
    if (Platform.OS !== 'web') {
      setState({ status: 'denied' });
      return;
    }
    (async () => {
      const [dash, seg] = await Promise.all([supabase.rpc('admin_dashboard'), supabase.rpc('admin_segments')]);
      if (dash.error) {
        setState(/admin only/i.test(dash.error.message) ? { status: 'denied' } : { status: 'error', message: dash.error.message });
        return;
      }
      setState({
        status: 'ready',
        data: dash.data as unknown as Dashboard,
        // Segments are optional: the overview still shows if that RPC fails.
        segments: seg.error ? null : (seg.data as unknown as Segments),
      });
    })();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>HABITQUEST · STATS</Text>

      {state.status === 'loading' && <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: spacing.xl }} />}
      {state.status === 'denied' && <Text style={styles.muted}>Accès refusé : page réservée aux admins.</Text>}
      {state.status === 'error' && <Text style={styles.muted}>Impossible de charger les stats : {state.message}</Text>}

      {state.status === 'ready' && (() => {
        const d = state.data;
        const s = state.segments;
        return (
          <>
            <Text style={styles.generated}>Mis à jour le {new Date(d.generated_at).toLocaleString('fr-FR')}</Text>
            <PixelFrame style={styles.legend} backgroundColor={colors.surface}>
              <Text style={styles.legendText}>
                « Actif » = a validé au moins une quête sur la période. « Activé » = a validé sa toute première quête.
                Avec moins de 5 joueurs dans une case, un pourcentage ne veut pas dire grand-chose : il est affiché en gris.
              </Text>
            </PixelFrame>

            <Section title="JOUEURS" hint="Combien de comptes existent et combien ont vraiment commencé." />
            <View style={styles.row}>
              <Metric label="COMPTES" value={d.users.total} hint="Tous les comptes créés" />
              <Metric label="NOUVEAUX AUJOURD'HUI" value={d.users.new_today} />
              <Metric label="NOUVEAUX · 7 J" value={d.users.new_7d} hint="Inscrits ces 7 derniers jours" />
              <Metric label="ACTIVÉS" value={`${d.users.activated} (${pct(d.users.activation_rate)})`} hint="Ont validé au moins 1 quête" />
              <Metric label="PREMIUM" value={`${d.users.premium} (${pct(d.users.premium_rate)})`} hint="Premium en cours (payé, essai ou parrainage)" />
            </View>

            {s && (
              <>
                <Section
                  title="PARCOURS D'UN NOUVEAU JOUEUR"
                  hint="Où les joueurs décrochent, étape par étape. Le % est calculé sur les inscrits ; « −x % » = perte depuis l'étape précédente. Hors comptes admin."
                />
                <Funnel steps={s.funnel} />

                <Section title="PAR SEGMENT" hint="Les mêmes chiffres découpés par groupe de joueurs. Choisis le découpage :" />
                <View style={styles.tabs}>
                  {DIMS.map((t) => (
                    <Pressable
                      key={t.key}
                      onPress={() => setDim(t.key)}
                      style={[styles.tab, dim === t.key && styles.tabActive]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: dim === t.key }}
                    >
                      <Text style={[styles.tabText, dim === t.key && styles.tabTextActive]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
                <SegmentTable dim={dim} rows={s[dim]} />

                <Section
                  title="COHORTES (RÉTENTION PAR SEMAINE D'INSCRIPTION)"
                  hint="Une ligne = les joueurs inscrits la même semaine. S1 = % qui ont validé une quête 1 à 7 jours après leur inscription, S2 = 8 à 14 jours après, etc. Plus les % restent hauts, mieux l'app retient. « … » = semaine pas encore terminée."
                />
                <CohortTable cohorts={s.cohorts} />
              </>
            )}

            <Section title="ACTIVITÉ" hint="Joueurs qui ont validé au moins une quête sur la période." />
            <View style={styles.row}>
              <Metric label="ACTIFS · 24 H" value={d.active.dau} />
              <Metric label="ACTIFS · 7 J" value={d.active.wau} />
              <Metric label="ACTIFS · 30 J" value={d.active.mau} />
              <Metric label="FIDÉLITÉ" value={pct(d.active.stickiness)} hint="Actifs 24 h ÷ actifs 7 j. 30 % ou plus = très bon" />
              <Metric label="DÉCROCHÉS" value={d.active.lapsed_7d} hint="Ont déjà joué, mais rien depuis 7 jours" />
            </View>

            <Section title="RÉTENTION À 7 JOURS" hint="Parmi les inscrits d'il y a 7 à 14 jours, combien jouent encore cette semaine." />
            <View style={styles.row}>
              <Metric label="RÉTENTION J7" value={pct(d.retention.d7_rate)} hint="20 % ou plus = bon pour une app d'habitudes" />
              <Metric label="TAILLE DU GROUPE" value={d.retention.d7_cohort} hint="Nombre d'inscrits concernés" />
            </View>

            <Section title="ENGAGEMENT" />
            <View style={styles.row}>
              <Metric label="QUÊTES VALIDÉES · AUJ." value={d.engagement.completions_today} />
              <Metric label="QUÊTES VALIDÉES · 7 J" value={d.engagement.completions_7d} />
              <Metric label="QUÊTES / ACTIF · 7 J" value={d.engagement.avg_completions_per_active_7d} hint="Quêtes validées par joueur actif sur la semaine" />
              <Metric label="SÉRIES EN COURS" value={d.engagement.active_streaks} hint="Habitudes avec une série d'au moins 1 jour" />
              <Metric label="HABITUDES" value={d.engagement.habits_total} hint="Habitudes actives, tous joueurs" />
              <Metric label="HABITUDES ARCHIVÉES" value={d.engagement.habits_archived} />
            </View>

            <Section title="SOCIAL" hint="Totaux depuis le lancement." />
            <View style={styles.row}>
              <Metric label="AMITIÉS" value={d.social.friends} />
              <Metric label="DUELS" value={d.social.duels} />
              <Metric label="KUDOS" value={d.social.kudos} />
              <Metric label="HUMEURS NOTÉES" value={d.social.moods} />
            </View>

            <Section title="DIVERS" />
            <View style={styles.row}>
              <Metric label="LISTE D'ATTENTE" value={d.funnel.waitlist} hint="E-mails laissés sur le site" />
              <Metric label="SUPPORT À TRAITER" value={d.funnel.support_open} hint="Messages de joueurs pas encore traités" />
              <Metric label="ACHATS BOUTIQUE" value={d.funnel.purchases} hint="Objets achetés avec l'or du jeu, pas de l'argent réel" />
            </View>

            <Section title="HABITUDES PAR CATÉGORIE" />
            <PixelFrame style={styles.chart} backgroundColor={colors.surface}>
              {d.habits_by_category.length === 0 ? (
                <Text style={styles.metricLabel}>Aucune habitude</Text>
              ) : (
                d.habits_by_category.map((c) => (
                  <View key={c.category} style={styles.catRow}>
                    <Text style={styles.catName}>{c.category}</Text>
                    <Text style={styles.catVal}>{c.n}</Text>
                  </View>
                ))
              )}
            </PixelFrame>

            <Section title="14 DERNIERS JOURS" />
            <BarChart title="Inscriptions par jour" points={d.signups_14d} />
            <BarChart title="Quêtes validées par jour" points={d.completions_14d} />
          </>
        );
      })()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xxl, gap: spacing.sm, maxWidth: 900, width: '100%', alignSelf: 'center' },
  title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
  generated: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
  legend: { marginBottom: spacing.xs },
  legendText: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, lineHeight: pixelSize(fontSizes.xs) * 1.5 },
  muted: { color: colors.textMuted, fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, marginTop: spacing.xl, textAlign: 'center' },
  sectionWrap: { marginTop: spacing.md, gap: 2 },
  section: { color: colors.accent, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, letterSpacing: 1 },
  sectionHint: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, lineHeight: pixelSize(fontSizes.xs) * 1.5 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: { flexGrow: 1, flexBasis: 140, minWidth: 110 },
  metricValue: { color: colors.text, fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold },
  metricLabel: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 0.5 },
  metricHint: { color: colors.textMuted, fontSize: pixelSize(9), fontFamily: fonts.bold, marginTop: 2 },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tab: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  tabActive: { borderColor: colors.accent, backgroundColor: colors.surfaceLight },
  tabText: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
  tabTextActive: { color: colors.accent },
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

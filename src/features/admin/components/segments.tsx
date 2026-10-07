/**
 * Tables of the founder dashboard: activation funnel, per-segment breakdown
 * and weekly signup cohorts (data from the `admin_segments` RPC).
 * French copy: internal tool, see admin-screen.tsx.
 */
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { PixelFrame } from '../../../ui/components/pixel-frame';

export type SegmentRow = {
  key: string;
  users: number;
  new_7d: number;
  activated: number;
  activation_rate: number;
  active_7d: number;
  active_rate: number;
  d7_cohort: number;
  d7_rate: number | null;
  premium: number;
};
export type FunnelStep = { step: string; n: number };
export type Cohort = { week: string; size: number; w1: number | null; w2: number | null; w3: number | null; w4: number | null };
export type SegmentDim = 'by_language' | 'by_platform' | 'by_region' | 'by_plan';
export type Segments = {
  generated_at: string;
  funnel: FunnelStep[];
  cohorts: Cohort[];
} & Record<SegmentDim, SegmentRow[]>;

/** Below this many players, a percentage is shown greyed out. */
export const SMALL_SAMPLE = 5;

const STEP_LABELS: Record<string, string> = {
  signed_up: 'Inscrits',
  created_habit: 'Ont créé une habitude',
  first_quest: 'Ont validé une 1re quête',
  three_days: 'Ont joué 3 jours différents',
  active_7d: 'Actifs cette semaine',
};

const LANGUAGE_LABELS: Record<string, string> = {
  fr: 'Français',
  en: 'Anglais',
  ja: 'Japonais',
  ko: 'Coréen',
  zh: 'Chinois (Taïwan)',
};

const PLATFORM_LABELS: Record<string, string> = {
  web: 'Site web',
  ios: 'iPhone',
  android: 'Android',
  unknown: 'Inconnue',
};

const PLAN_LABELS: Record<string, string> = { free: 'Gratuit', premium: 'Premium' };

const DIM_HINTS: Record<SegmentDim, string> = {
  by_language: "Langue choisie dans l'app : le meilleur indicateur du pays d'origine.",
  by_platform: "Dernier appareil utilisé. « Inconnue » = pas rouvert l'app depuis l'ajout de ce suivi (07/10).",
  by_region: "Fuseau horaire du téléphone (≈ pays). « Inconnue » = pas encore synchronisé.",
  by_plan: 'Gratuit ou Premium en cours.',
};

/** Human label of a segment key. */
export function segmentLabel(dim: SegmentDim, key: string): string {
  if (dim === 'by_language') return LANGUAGE_LABELS[key] ?? key;
  if (dim === 'by_platform') return PLATFORM_LABELS[key] ?? key;
  if (dim === 'by_plan') return PLAN_LABELS[key] ?? key;
  if (key === 'unknown') return 'Inconnue';
  // "Asia/Tokyo" → "Tokyo", "America/Argentina/Buenos_Aires" → "Buenos Aires"
  return key.split('/').pop()!.replace(/_/g, ' ');
}

function Pct({ value, base }: { value: number | null; base: number }) {
  if (value === null || value === undefined) return <Text style={[styles.cell, styles.dim]}>—</Text>;
  return <Text style={[styles.cell, base < SMALL_SAMPLE && styles.dim]}>{value}%</Text>;
}

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const top = Math.max(1, steps[0]?.n ?? 0);
  return (
    <PixelFrame style={styles.frame} backgroundColor={colors.surface}>
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1].n : null;
        const lost = prev ? Math.round(100 * (1 - s.n / prev)) : null;
        return (
          <View key={s.step} style={styles.funnelRow}>
            <View style={styles.funnelHead}>
              <Text style={styles.funnelLabel}>{STEP_LABELS[s.step] ?? s.step}</Text>
              <Text style={styles.funnelVal}>
                {s.n} · {Math.round((100 * s.n) / top)}%
                {lost !== null && lost > 0 ? <Text style={styles.lost}>  −{lost}%</Text> : null}
              </Text>
            </View>
            <View style={styles.funnelTrack}>
              <View style={[styles.funnelFill, { width: `${(100 * s.n) / top}%` }]} />
            </View>
          </View>
        );
      })}
    </PixelFrame>
  );
}

const SEG_COLS = [
  { label: 'JOUEURS', hint: 'comptes' },
  { label: 'NOUV. 7 J', hint: 'inscrits' },
  { label: 'ACTIVÉS', hint: '1re quête' },
  { label: 'ACTIFS 7 J', hint: 'cette sem.' },
  { label: 'RÉT. J7', hint: 'encore là' },
  { label: 'PREMIUM', hint: 'en cours' },
];

export function SegmentTable({ dim, rows }: { dim: SegmentDim; rows: SegmentRow[] }) {
  return (
    <PixelFrame style={styles.frame} backgroundColor={colors.surface}>
      <Text style={styles.tableHint}>{DIM_HINTS[dim]}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, styles.keyCol]}>SEGMENT</Text>
            {SEG_COLS.map((c) => (
              <View key={c.label} style={styles.numCol}>
                <Text style={styles.th}>{c.label}</Text>
                <Text style={styles.thHint}>{c.hint}</Text>
              </View>
            ))}
          </View>
          {rows.length === 0 ? (
            <Text style={[styles.cell, styles.dim, { padding: spacing.sm }]}>Aucun joueur</Text>
          ) : (
            rows.map((r) => (
              <View key={r.key} style={styles.tr}>
                <Text style={[styles.cell, styles.keyCol, styles.keyText]} numberOfLines={1}>
                  {segmentLabel(dim, r.key)}
                </Text>
                <View style={styles.numCol}><Text style={styles.cell}>{r.users}</Text></View>
                <View style={styles.numCol}><Text style={styles.cell}>{r.new_7d}</Text></View>
                <View style={styles.numCol}><Pct value={r.activation_rate} base={r.users} /></View>
                <View style={styles.numCol}><Pct value={r.active_rate} base={r.users} /></View>
                <View style={styles.numCol}><Pct value={r.d7_rate} base={r.d7_cohort} /></View>
                <View style={styles.numCol}><Text style={styles.cell}>{r.premium}</Text></View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </PixelFrame>
  );
}

export function CohortTable({ cohorts }: { cohorts: Cohort[] }) {
  const cell = (v: number | null, size: number) =>
    v === null ? <Text style={[styles.cell, styles.dim]}>…</Text> : <Pct value={v} base={size} />;
  return (
    <PixelFrame style={styles.frame} backgroundColor={colors.surface}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View style={[styles.tr, styles.thead]}>
            <Text style={[styles.th, styles.keyCol]}>SEMAINE DU</Text>
            {['INSCRITS', 'S1', 'S2', 'S3', 'S4'].map((h) => (
              <View key={h} style={styles.numCol}><Text style={styles.th}>{h}</Text></View>
            ))}
          </View>
          {cohorts.map((c) => (
            <View key={c.week} style={styles.tr}>
              <Text style={[styles.cell, styles.keyCol, styles.keyText]}>
                {c.week.slice(8)}/{c.week.slice(5, 7)}
              </Text>
              <View style={styles.numCol}><Text style={styles.cell}>{c.size}</Text></View>
              <View style={styles.numCol}>{c.size === 0 ? <Text style={[styles.cell, styles.dim]}>—</Text> : cell(c.w1, c.size)}</View>
              <View style={styles.numCol}>{c.size === 0 ? <Text style={[styles.cell, styles.dim]}>—</Text> : cell(c.w2, c.size)}</View>
              <View style={styles.numCol}>{c.size === 0 ? <Text style={[styles.cell, styles.dim]}>—</Text> : cell(c.w3, c.size)}</View>
              <View style={styles.numCol}>{c.size === 0 ? <Text style={[styles.cell, styles.dim]}>—</Text> : cell(c.w4, c.size)}</View>
            </View>
          ))}
        </View>
      </ScrollView>
    </PixelFrame>
  );
}

const styles = StyleSheet.create({
  frame: { marginTop: spacing.xs },
  tableHint: { color: colors.textMuted, fontSize: pixelSize(9), fontFamily: fonts.bold, marginBottom: spacing.sm },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 6 },
  thead: { borderBottomWidth: 2 },
  keyCol: { width: 150 },
  numCol: { width: 86, alignItems: 'flex-end', paddingRight: spacing.xs },
  th: { color: colors.textSecondary, fontSize: pixelSize(9), fontFamily: fonts.bold },
  thHint: { color: colors.textMuted, fontSize: pixelSize(8), fontFamily: fonts.bold },
  cell: { color: colors.text, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
  keyText: { color: colors.accent },
  dim: { color: colors.textMuted },
  funnelRow: { paddingVertical: 5, gap: 4 },
  funnelHead: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  funnelLabel: { color: colors.text, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, flexShrink: 1 },
  funnelVal: { color: colors.accent, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
  lost: { color: colors.danger },
  funnelTrack: { height: 12, backgroundColor: colors.border },
  funnelFill: { height: '100%', backgroundColor: colors.success },
});

import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fetchArcState, collectedSeasons, type ArcState, type ArcWeek } from '../api';
import { Rune } from '../components/rune';
import { RUNE_PALETTES } from '../sprites';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelProgress } from '../../../ui/components/pixel-progress';
import { shareViewAsImage } from '../../stats/utils/share-image';
import { SEASONS, ARC } from '../../../lib/constants/game-config';
import { useT, useLang, localeTag } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';

function WeekCell({ week, color }: { week: ArcWeek; color: string }) {
  const style = week.future
    ? styles.cellFuture
    : week.good
      ? [styles.cellGood, { backgroundColor: color, borderColor: color }]
      : week.current
        ? styles.cellCurrent
        : styles.cellMissed;
  return (
    <View style={[styles.cell, style]} testID={`arc-week-${week.good ? 'good' : week.future ? 'future' : week.current ? 'current' : 'missed'}`}>
      {week.good ? <Text style={styles.cellCheck}>✓</Text> : null}
    </View>
  );
}

/** The season's arc: its weeks, the rune to win, and the runes collected. */
export default function ArcScreen() {
  const T = useT();
  const lang = useLang();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [arc, setArc] = useState<ArcState | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

  useEffect(() => {
    fetchArcState().then(setArc).catch(() => setArc(null));
  }, []);

  if (!arc) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const color = RUNE_PALETTES[arc.season].s;
  const name = T[`arc_name_${arc.season}`];
  const fmt = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(localeTag(lang), { day: 'numeric', month: 'long' });
  const collected = collectedSeasons(arc);
  const weeksLeft = arc.weeks.filter((w) => w.future).length + (arc.weeks.some((w) => w.current) ? 1 : 0);

  const share = async () => {
    setNote(null);
    const result = await shareViewAsImage(cardRef, T.arc_share_text.replace('{name}', name));
    if (result === 'downloaded') setNote(T.stats_share_downloaded);
    else if (result === 'failed') setNote(T.stats_share_failed);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.sm }]}>
      <Pressable onPress={() => router.back()} accessibilityRole="button" hitSlop={8}>
        <Text style={styles.back}>{T.common_back}</Text>
      </Pressable>

      {/* The card that gets shared */}
      <View ref={cardRef} collapsable={false} style={[styles.card, { borderColor: color }]} testID="arc-card">
        <Text style={styles.kicker}>{T.arc_kicker}</Text>
        <Text style={[styles.title, { color }]}>{name} {arc.arc_year}</Text>
        <Text style={styles.dates}>{T.arc_dates.replace('{start}', fmt(arc.starts_on)).replace('{end}', fmt(arc.ends_on))}</Text>
        <View style={styles.runeRow}>
          <Rune season={arc.season} size={96} earned={arc.rune_earned} />
        </View>
        <Text style={styles.progressText}>
          {arc.rune_earned
            ? T.arc_rune_done
            : T.arc_progress.replace('{n}', String(Math.min(arc.good_weeks, arc.target))).replace('{target}', String(arc.target))}
        </Text>
        <PixelProgress progress={Math.min(1, arc.good_weeks / arc.target)} color={color} segments={arc.target} />
        <View style={styles.grid}>
          {arc.weeks.map((w) => (
            <WeekCell key={w.week_start} week={w} color={color} />
          ))}
        </View>
        <Text style={styles.small}>
          {arc.rune_earned ? T.arc_keep_going : T.arc_weeks_left.replace('{n}', String(weeksLeft))}
        </Text>
      </View>

      <PixelButton title={T.arc_share} onPress={() => void share()} variant="secondary" testID="arc-share" />
      {note ? <Text style={styles.small}>{note}</Text> : null}

      <Text style={styles.section}>{T.arc_how_title}</Text>
      <Text style={styles.body}>
        {T.arc_rule
          .replace('{pct}', String(ARC.GOOD_WEEK_PCT))
          .replace('{n}', String(ARC.GOOD_WEEKS_FOR_RUNE))
          .replace('{xp}', String(ARC.RUNE_XP))
          .replace('{gold}', String(ARC.RUNE_GOLD))}
      </Text>

      <Text style={styles.section}>{T.arc_runes_title}</Text>
      <View style={styles.collection}>
        {SEASONS.map((s) => (
          <View key={s} style={styles.collected}>
            <Rune season={s} size={44} earned={collected.has(s)} />
            <Text style={[styles.seasonName, collected.has(s) && { color: RUNE_PALETTES[s].s }]}>{T[`arc_name_${s}`]}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.body}>{arc.four_seasons_done ? T.arc_four_done : T.arc_four_rule}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
  back: { color: colors.textSecondary, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm) },
  card: { backgroundColor: colors.surface, borderWidth: 3, borderRadius: 0, padding: spacing.md, gap: spacing.sm, alignItems: 'stretch' },
  kicker: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), letterSpacing: 2, textAlign: 'center' },
  title: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xxl), letterSpacing: 2, textAlign: 'center' },
  dates: { color: colors.textSecondary, fontSize: fontSizes.sm, textAlign: 'center' },
  runeRow: { alignItems: 'center', paddingVertical: spacing.sm },
  progressText: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.md), textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginTop: spacing.xs },
  cell: { width: 30, height: 30, borderWidth: 2, borderRadius: 0, alignItems: 'center', justifyContent: 'center' },
  cellGood: {},
  cellCurrent: { borderColor: colors.primary, backgroundColor: colors.background },
  cellMissed: { borderColor: colors.border, backgroundColor: colors.background },
  cellFuture: { borderColor: colors.border, backgroundColor: colors.surface, opacity: 0.4 },
  cellCheck: { color: '#000', fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm) },
  small: { color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center' },
  section: { color: colors.text, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), letterSpacing: 2, marginTop: spacing.sm },
  body: { color: colors.textSecondary, fontSize: fontSizes.sm, lineHeight: 20 },
  collection: { flexDirection: 'row', justifyContent: 'space-between' },
  collected: { alignItems: 'center', gap: 4, flex: 1 },
  seasonName: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.xs), textAlign: 'center' },
});

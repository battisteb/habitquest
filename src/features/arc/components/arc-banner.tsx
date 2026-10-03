import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { use$ } from '@legendapp/state/react';
import { habitsStore$ } from '../../habits/stores/habits-store';
import { refreshProfile } from '../../gamification/stores/profile-store';
import { fetchArcState, collectedSeasons, type ArcState } from '../api';
import { Rune } from './rune';
import { RUNE_PALETTES } from '../sprites';
import { PixelProgress } from '../../../ui/components/pixel-progress';
import { showDialog } from '../../../lib/app-alert';
import { storage } from '../../../lib/storage/mmkv';
import { playSfx } from '../../../lib/audio/sound-service';
import { useT, type Strings } from '../../../lib/i18n';
import { colors, fontSizes, fonts, pixelSize, spacing } from '../../../ui/theme/tokens';

const SEEN_KEY = 'arc-seen';

/** Pip announces a new arc once, then celebrates the rune and the four seasons. */
function announce(T: Strings, arc: ArcState) {
  const name = T[`arc_name_${arc.season}`];
  const key = `${arc.season}-${arc.arc_year}`;
  if (storage.getString(SEEN_KEY) !== key) {
    storage.set(SEEN_KEY, key);
    showDialog(T.arc_intro_title.replace('{name}', name), T.arc_intro_msg.replace('{name}', name));
  }
  if (arc.rune_new) {
    void playSfx('missions_all');
    const left = 4 - collectedSeasons(arc).size;
    showDialog(
      T.arc_rune_new_title,
      T.arc_rune_new_msg.replace('{name}', name) + (left > 0 ? ` ${T.arc_runes_left.replace('{n}', String(left))}` : ''),
    );
  }
  if (arc.four_seasons_reward) {
    showDialog(T.arc_four_title, arc.four_seasons_reward === 'premium_week' ? T.arc_four_premium_msg : T.arc_four_gold_msg);
  }
  if (arc.rune_new || arc.four_seasons_reward) refreshProfile();
}

/** The season's arc on the Quests screen: one compact line, a tap opens it. */
export function ArcBanner() {
  const T = useT();
  const router = useRouter();
  const [arc, setArc] = useState<ArcState | null>(null);
  const completions = use$(habitsStore$.todayCompletions);
  const doneToday = Object.values(completions).filter(Boolean).length;

  useEffect(() => {
    let cancelled = false;
    fetchArcState()
      .then((a) => {
        if (cancelled) return;
        setArc(a);
        announce(T, a);
      })
      .catch(() => {
        // Offline: the line just stays hidden.
      });
    return () => {
      cancelled = true;
    };
  }, [doneToday]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!arc) return null;
  const color = RUNE_PALETTES[arc.season].s;
  return (
    <Pressable onPress={() => router.push('/arc')} style={[styles.banner, { borderColor: color }]} accessibilityRole="button" testID="arc-banner">
      <Rune season={arc.season} size={28} earned={arc.rune_earned} />
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={[styles.name, { color }]}>{T[`arc_name_${arc.season}`]}</Text>
          <Text style={styles.count}>
            {arc.rune_earned
              ? T.arc_rune_done
              : T.arc_progress.replace('{n}', String(Math.min(arc.good_weeks, arc.target))).replace('{target}', String(arc.target))}
          </Text>
        </View>
        <PixelProgress progress={Math.min(1, arc.good_weeks / arc.target)} color={color} height={6} segments={arc.target} />
      </View>
      <Text style={[styles.arrow, { color }]}>▶</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderRadius: 0,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    marginBottom: spacing.sm,
  },
  info: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  name: { fontFamily: fonts.bold, fontSize: pixelSize(fontSizes.sm), letterSpacing: 1 },
  count: { color: colors.textSecondary, fontSize: fontSizes.xs },
  arrow: { fontFamily: fonts.bold, fontSize: pixelSize(10) },
});

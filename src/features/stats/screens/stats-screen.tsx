import { useCallback, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Modal } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../../ui/components/pixel-button';
import { CategoryBreakdown } from '../../habits/components/category-breakdown';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { AdBanner } from '../../monetization/components/ad-banner';
import { usePremium } from '../../monetization/hooks/use-premium';
import { LIMITS } from '../../monetization/utils/feature-gates';
import { profileStore$, refreshProfile } from '../../gamification/stores/profile-store';
import { avatarConfigStore$ } from '../../avatar/stores/avatar-config-store';
import { shopStore$ } from '../../shop/stores/shop-store';
import { getRankForLevel } from '../../../lib/constants/game-config';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT } from '../../../lib/i18n';
import { titleLabel } from '../../../lib/i18n/labels';
import { useStatsData, HISTORY_WEEKS } from '../hooks/use-stats-data';
import {
  addDays,
  averageRate,
  bestWeekday,
  dayKey,
  dayRates,
  weekOverWeek,
  weekStart,
  yearGrid,
} from '../utils/stats-math';
import { YearPixels, YearLegend } from '../components/year-pixels';
import { WeekBars, Insight } from '../components/stats-charts';
import { ShareCard } from '../components/share-card';
import { shareViewAsImage } from '../utils/share-image';

const WEEKDAY_KEYS = ['day_long_mon', 'day_long_tue', 'day_long_wed', 'day_long_thu', 'day_long_fri', 'day_long_sat', 'day_long_sun'] as const;

export default function StatsScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(createStyles, [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const data = useStatsData();
  const { canViewFullHistory } = usePremium();
  const profile = use$(profileStore$.profile);
  const colorsLook = use$(avatarConfigStore$);
  const gear = use$(shopStore$.equippedSlots);
  const [habitFilter, setHabitFilter] = useState<string | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const [shareNote, setShareNote] = useState<string | null>(null);
  const cardRef = useRef<View>(null);

  // Stats change as soon as a quest is completed: reload when the tab is shown.
  const { reload } = data;
  useFocusEffect(
    useCallback(() => {
      reload();
      refreshProfile();
    }, []), // eslint-disable-line react-hooks/exhaustive-deps
  );

  const today = useMemo(() => new Date(), [data.completions]); // eslint-disable-line react-hooks/exhaustive-deps
  const todayKey = dayKey(today);
  const lockedBefore = canViewFullHistory ? null : dayKey(addDays(today, -(LIMITS.FREE_STATS_DAYS - 1)));

  const computed = useMemo(() => {
    const from = addDays(weekStart(today), -7 * (HISTORY_WEEKS - 1));
    const all = dayRates(data.habits, data.completions, from, today);
    const allMap = new Map(all.map((d) => [d.date, d]));
    const filtered = habitFilter ? dayRates(data.habits, data.completions, from, today, habitFilter) : all;
    const filteredMap = new Map(filtered.map((d) => [d.date, d]));
    const visible = (d: { date: string }) => !lockedBefore || d.date >= lockedBefore;
    const last7 = all.slice(-7);
    const last30 = all.slice(-30);
    return {
      weeks: yearGrid(filteredMap, today),
      last7,
      rate7: averageRate(last7),
      rate30: averageRate(last30),
      delta: weekOverWeek(allMap, today),
      best: bestWeekday(all.filter(visible).slice(-84)),
      perfectDays: filtered.filter((d) => visible(d) && d.rate === 1).length,
    };
  }, [data.habits, data.completions, habitFilter, lockedBefore, today]);


  const level = profile?.level ?? 1;
  const look = {
    skinColor: colorsLook.skinColor,
    hairColor: colorsLook.hairColor,
    eyeColor: colorsLook.eyeColor,
    hat: gear.hat?.item?.sprite_key,
    outfit: gear.outfit?.item?.sprite_key,
    accessory: gear.accessory?.item?.sprite_key,
  };

  const share = async () => {
    setShareNote(null);
    const result = await shareViewAsImage(cardRef, T.stats_share_text);
    if (result === 'downloaded') setShareNote(T.stats_share_downloaded);
    else if (result === 'failed') setShareNote(T.stats_share_failed);
    else setSharing(false);
  };

  if (data.isLoading) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const delta = computed.delta;
  const pct = (r: number | null) => (r === null ? '–' : `${Math.round(r * 100)}%`);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{T.stats_title}</Text>
        {data.habits.length > 0 && (
          <PixelButton title={T.stats_share_btn} onPress={() => setSharing(true)} variant="secondary" />
        )}
      </View>

      {data.habits.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.empty}>{T.stats_empty}</Text>
          <PixelButton title={T.stats_empty_cta} onPress={() => router.push('/habit/create')} />
        </View>
      ) : (
        <>
          <View style={styles.statRow}>
            <StatCard value={data.totalCompletions} label={T.stats_total_done} color={colors.success} styles={styles} />
            <StatCard
              value={pct(computed.rate7)}
              label={T.stats_rate_7d}
              color={colors.xp}
              styles={styles}
              sub={delta === null ? undefined : `${delta >= 0 ? '▲ +' : '▼ '}${delta} ${T.stats_pts_vs_prev}`}
              subColor={delta !== null && delta < 0 ? colors.danger : colors.success}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard value={data.activeStreaks} label={T.stats_active_streaks} color={colors.streak} styles={styles} />
            <StatCard value={data.bestStreak} label={T.stats_best_streak} color={colors.accent} styles={styles} />
          </View>

          {/* Year in pixels */}
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Text style={styles.cardTitle}>{T.stats_year_title}</Text>
              <Text style={styles.cardNote}>
                {T.stats_perfect_days.replace('{n}', String(computed.perfectDays))}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              <Chip label={T.stats_filter_all} active={!habitFilter} onPress={() => setHabitFilter(undefined)} styles={styles} />
              {data.habits.map((h) => (
                <Chip
                  key={h.id}
                  label={`${h.emoji ? `${h.emoji} ` : ''}${h.name}`}
                  active={habitFilter === h.id}
                  onPress={() => setHabitFilter(h.id)}
                  styles={styles}
                />
              ))}
            </ScrollView>
            <YearPixels
              weeks={computed.weeks}
              lockedBefore={lockedBefore}
              onLockedPress={lockedBefore ? () => router.push('/paywall') : undefined}
            />
            <YearLegend />
          </View>

          {/* Last 7 days */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{T.stats_last_7_days}</Text>
            <WeekBars days={computed.last7} today={todayKey} />
          </View>

          <View style={styles.statRow}>
            <Insight
              icon={delta !== null && delta < 0 ? '📉' : '📈'}
              value={delta === null ? '–' : `${delta >= 0 ? '+' : ''}${delta} pts`}
              label={T.stats_vs_prev_7}
              tone={delta === null ? 'neutral' : delta >= 0 ? 'good' : 'bad'}
            />
            <Insight
              icon="⭐"
              value={computed.best === null ? '–' : T[WEEKDAY_KEYS[computed.best]]}
              label={T.stats_best_day}
            />
          </View>

          <CategoryBreakdown />
        </>
      )}

      <PixelButton title={T.stats_btn_recap} onPress={() => router.push('/weekly-recap')} variant="secondary" />
      <PixelButton title={T.stats_btn_achievements} onPress={() => router.push('/achievements')} variant="secondary" />

      <AdBanner position="inline" />

      <Modal visible={sharing} transparent animationType="fade" onRequestClose={() => setSharing(false)}>
        <View style={styles.modalBack}>
          <ShareCard
            ref={cardRef}
            username={profile?.username ?? ''}
            rank={titleLabel(T, getRankForLevel(level).name)}
            look={look}
            bestStreak={data.bestStreak}
            rate30={computed.rate30}
            total={data.totalCompletions}
            weeks={yearGrid(new Map(dayRates(data.habits, data.completions, addDays(weekStart(today), -7 * (HISTORY_WEEKS - 1)), today).map((d) => [d.date, d])), today)}
            lockedBefore={lockedBefore}
          />
          {shareNote && <Text style={styles.shareNote}>{shareNote}</Text>}
          <View style={styles.modalButtons}>
            <PixelButton title={T.stats_share_cta} onPress={share} />
            <PixelButton title={T.common_close} onPress={() => setSharing(false)} variant="ghost" />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Chip({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: active }}>
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

function StatCard({
  value,
  label,
  color,
  sub,
  subColor,
  styles,
}: {
  value: number | string;
  label: string;
  color: string;
  sub?: string;
  subColor?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {sub && <Text style={[styles.statSub, { color: subColor }]}>{sub}</Text>}
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
    statRow: { flexDirection: 'row', gap: spacing.md },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
    },
    statValue: { fontSize: pixelSize(fontSizes.title), fontFamily: fonts.bold },
    statLabel: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 1, textAlign: 'center' },
    statSub: { fontSize: pixelSize(9), fontFamily: fonts.bold, textAlign: 'center' },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardTitle: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 1 },
    cardNote: { color: colors.success, fontSize: pixelSize(9), fontFamily: fonts.bold },
    chips: { gap: spacing.xs },
    chip: { paddingVertical: 4, paddingHorizontal: spacing.sm, borderWidth: 2, borderColor: colors.border, maxWidth: 180 },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
    chipText: { color: colors.textMuted, fontSize: pixelSize(9), fontFamily: fonts.bold },
    chipTextActive: { color: colors.text },
    empty: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.sm), textAlign: 'center', lineHeight: 20 },
    section: { gap: spacing.sm },
    sectionTitle: { color: colors.textMuted, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, letterSpacing: 2 },
    modalBack: { flex: 1, backgroundColor: 'rgba(5,6,13,0.92)', alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.md },
    modalButtons: { width: 360, maxWidth: '100%', gap: spacing.sm },
    shareNote: { color: colors.textSecondary, fontSize: pixelSize(fontSizes.sm), textAlign: 'center' },
  });
}

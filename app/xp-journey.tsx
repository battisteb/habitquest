import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../src/ui/components/pixel-button';
import { useProfileStats } from '../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../src/features/gamification/components/xp-bar';
import { supabase } from '../src/lib/supabase/client';
import { authStore$ } from '../src/features/auth/stores/auth-store';
import {
  RANKS,
  LEVEL_THRESHOLDS,
  getRankForLevel,
  getXpForNextLevel,
  calculateXpEarned,
  XP_CONFIG,
} from '../src/lib/constants/game-config';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { useTheme } from '../src/ui/theme/theme-context';

interface DayXp {
  date: string;       // 'Mon', 'Tue', etc.
  xp: number;
}

interface RecentGain {
  habitName: string;
  xpEarned: number;
  completedAt: string;
}

interface XpJourneyData {
  dailyXp: DayXp[];
  recentGains: RecentGain[];
  bestStreak: number;
  totalCompletions: number;
  isLoading: boolean;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

async function fetchXpJourneyData(): Promise<Omit<XpJourneyData, 'isLoading'>> {
  const userId = authStore$.user.get()?.id;
  if (!userId) return { dailyXp: [], recentGains: [], bestStreak: 0, totalCompletions: 0 };

  const { data: habits } = await supabase
    .from('habits')
    .select('id, name')
    .eq('user_id', userId);

  const habitIds = habits?.map((h) => h.id) ?? [];
  const habitNameMap = new Map(habits?.map((h) => [h.id, h.name]) ?? []);

  if (habitIds.length === 0) {
    return { dailyXp: [], recentGains: [], bestStreak: 0, totalCompletions: 0 };
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
  fourteenDaysAgo.setHours(0, 0, 0, 0);

  const [completionsRes, streaksRes] = await Promise.all([
    supabase
      .from('completions')
      .select('habit_id, xp_earned, completed_at')
      .in('habit_id', habitIds)
      .gte('completed_at', fourteenDaysAgo.toISOString())
      .order('completed_at', { ascending: false }),
    supabase
      .from('streaks')
      .select('current_count, longest_count')
      .in('habit_id', habitIds),
  ]);

  // Daily XP for the last 14 days
  const dayMap = new Map<string, { xp: number; label: string }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { xp: 0, label: DAY_LABELS[d.getDay()] });
  }

  completionsRes.data?.forEach((c) => {
    const key = c.completed_at.slice(0, 10);
    const entry = dayMap.get(key);
    if (entry) entry.xp += c.xp_earned ?? 0;
  });

  const dailyXp: DayXp[] = [];
  dayMap.forEach(({ xp, label }) => dailyXp.push({ date: label, xp }));

  // Recent gains (last 15)
  const recentGains: RecentGain[] = (completionsRes.data ?? [])
    .slice(0, 15)
    .map((c) => ({
      habitName: habitNameMap.get(c.habit_id) ?? 'Unknown',
      xpEarned: c.xp_earned ?? 0,
      completedAt: c.completed_at,
    }));

  // Best streak
  const bestStreak = Math.max(
    0,
    ...(streaksRes.data ?? []).map((s) =>
      Math.max(s.current_count ?? 0, s.longest_count ?? 0),
    ),
  );

  // Total completions (all time)
  const { count } = await supabase
    .from('completions')
    .select('*', { count: 'exact', head: true })
    .in('habit_id', habitIds);

  return {
    dailyXp,
    recentGains,
    bestStreak,
    totalCompletions: count ?? 0,
  };
}

function formatRelativeDate(isoString: string): string {
  const date = new Date(isoString);
  const today = new Date();
  const diffDays = Math.floor(
    (today.setHours(0, 0, 0, 0) - date.setHours(0, 0, 0, 0)) / 86400000,
  );
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export default function XpJourneyScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },

  // Hero card
  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.xp + '88',
    borderRadius: 4,
    borderBottomWidth: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLevel: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.xp,
    letterSpacing: 2,
  },
  heroRank: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginTop: 2,
  },
  heroXpTotal: { alignItems: 'flex-end' },
  heroXpValue: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.text,
  },
  heroXpLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  xpDetail: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Section
  section: { gap: spacing.xs },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // Chart
  chartCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    paddingTop: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 110,
  },
  chartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartXp: {
    color: colors.xp,
    fontSize: 8,
    fontWeight: 'bold',
    height: 12,
    textAlign: 'center',
  },
  chartBarTrack: {
    width: '100%',
    height: 80,
    justifyContent: 'flex-end',
  },
  chartBarFill: {
    width: '100%',
    borderRadius: 2,
    minHeight: 0,
  },
  chartLabel: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  chartLabelToday: { color: colors.accent },

  // Multiplier
  multiplierCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  multiplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  multiplierItem: { alignItems: 'center', gap: 2 },
  multiplierArrow: { paddingHorizontal: 4 },
  arrowText: { color: colors.textMuted, fontSize: fontSizes.lg },
  multiplierValue: {
    fontSize: fontSizes.lg,
    fontWeight: 'bold',
    color: colors.text,
  },
  multiplierLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  multiplierBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  multiplierFill: {
    height: '100%',
    backgroundColor: colors.xp,
    borderRadius: 3,
  },
  multiplierHint: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: 'center',
    letterSpacing: 0.5,
  },

  // Roadmap
  roadmapCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    gap: spacing.sm,
  },
  roadmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  roadmapDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roadmapInfo: { flex: 1 },
  roadmapRank: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  roadmapReq: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 1,
  },
  roadmapCheck: { fontSize: fontSizes.lg, fontWeight: 'bold' },
  roadmapNext: {
    fontSize: 9,
    color: colors.xp,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },

  // Recent gains
  gainsCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  gainDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gainHabit: {
    flex: 1,
    color: colors.text,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  gainRight: { alignItems: 'flex-end', gap: 1 },
  gainXp: {
    color: colors.xp,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
  },
  gainDate: {
    color: colors.textMuted,
    fontSize: 9,
  },
}), [themeKey]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, xpForNextLevel, xpProgress } = useProfileStats();
  const [data, setData] = useState<XpJourneyData>({
    dailyXp: [],
    recentGains: [],
    bestStreak: 0,
    totalCompletions: 0,
    isLoading: true,
  });

  useEffect(() => {
    fetchXpJourneyData().then((d) => setData({ ...d, isLoading: false }));
  }, []);

  const level = profile?.level ?? 0;
  const totalXp = profile?.xp ?? 0;
  const rank = getRankForLevel(level);

  // Current level XP bounds
  const currentLevelXp = level > 0 ? LEVEL_THRESHOLDS[Math.min(level, LEVEL_THRESHOLDS.length - 1)] : 0;
  const xpInLevel = totalXp - currentLevelXp;
  const xpNeeded = xpForNextLevel - currentLevelXp;

  // Streak multiplier
  const multiplier = Math.min(
    1 + data.bestStreak * XP_CONFIG.STREAK_MULTIPLIER_STEP,
    XP_CONFIG.STREAK_MULTIPLIER_CAP,
  );
  const baseXp = XP_CONFIG.BASE_XP_PER_COMPLETION;

  // Chart max
  const chartMax = Math.max(...data.dailyXp.map((d) => d.xp), 1);

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        <PixelButton title="Back" onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>XP JOURNEY</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Hero */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.heroLevel}>LEVEL {level}</Text>
            <Text style={[styles.heroRank, { color: rank.color }]}>{rank.name}</Text>
          </View>
          <View style={styles.heroXpTotal}>
            <Text style={styles.heroXpValue}>{totalXp.toLocaleString()}</Text>
            <Text style={styles.heroXpLabel}>TOTAL XP</Text>
          </View>
        </View>
        <XpBar
          level={level}
          currentXp={totalXp}
          nextLevelXp={xpForNextLevel}
          progress={xpProgress}
        />
        <Text style={styles.xpDetail}>
          {xpInLevel} / {xpNeeded} XP to level {level + 1}
        </Text>
      </View>

      {/* Daily XP chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>XP LAST 14 DAYS</Text>
        <View style={styles.chartCard}>
          {data.isLoading ? (
            <ActivityIndicator color={colors.xp} />
          ) : (
            <View style={styles.chart}>
              {data.dailyXp.map((d, i) => {
                const barHeight = chartMax > 0 ? (d.xp / chartMax) * 80 : 0;
                const isToday = i === data.dailyXp.length - 1;
                return (
                  <View key={i} style={styles.chartBar}>
                    <Text style={styles.chartXp}>
                      {d.xp > 0 ? d.xp : ''}
                    </Text>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBarFill,
                          {
                            height: Math.max(barHeight, d.xp > 0 ? 4 : 0),
                            backgroundColor: isToday ? colors.accent : colors.xp,
                            opacity: d.xp > 0 ? 1 : 0.15,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.chartLabel, isToday && styles.chartLabelToday]}>
                      {d.date}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Streak multiplier */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>STREAK BONUS</Text>
        <View style={styles.multiplierCard}>
          <View style={styles.multiplierRow}>
            <View style={styles.multiplierItem}>
              <Text style={styles.multiplierValue}>🔥 {data.bestStreak}</Text>
              <Text style={styles.multiplierLabel}>BEST STREAK</Text>
            </View>
            <View style={styles.multiplierArrow}><Text style={styles.arrowText}>→</Text></View>
            <View style={styles.multiplierItem}>
              <Text style={[styles.multiplierValue, { color: colors.xp }]}>
                ×{multiplier.toFixed(1)}
              </Text>
              <Text style={styles.multiplierLabel}>MULTIPLIER</Text>
            </View>
            <View style={styles.multiplierArrow}><Text style={styles.arrowText}>→</Text></View>
            <View style={styles.multiplierItem}>
              <Text style={[styles.multiplierValue, { color: colors.accent }]}>
                {calculateXpEarned(data.bestStreak)} XP
              </Text>
              <Text style={styles.multiplierLabel}>PER HABIT</Text>
            </View>
          </View>
          <View style={styles.multiplierBar}>
            <View
              style={[
                styles.multiplierFill,
                { width: `${((multiplier - 1) / (XP_CONFIG.STREAK_MULTIPLIER_CAP - 1)) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.multiplierHint}>
            Max ×{XP_CONFIG.STREAK_MULTIPLIER_CAP} at streak {Math.round((XP_CONFIG.STREAK_MULTIPLIER_CAP - 1) / XP_CONFIG.STREAK_MULTIPLIER_STEP)}+
          </Text>
        </View>
      </View>

      {/* Level roadmap */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>LEVEL ROADMAP</Text>
        <View style={styles.roadmapCard}>
          {RANKS.map((r, i) => {
            const nextRank = RANKS[i + 1];
            const rankLevelXp = LEVEL_THRESHOLDS[Math.min(r.minLevel, LEVEL_THRESHOLDS.length - 1)];
            const isCurrentRank = rank.name === r.name;
            const isPast = level >= r.minLevel;
            const isNext = nextRank ? level < nextRank.minLevel && level >= r.minLevel : false;

            return (
              <View key={r.name} style={styles.roadmapRow}>
                <View style={[styles.roadmapDot, { backgroundColor: isPast ? r.color : colors.border }]} />
                <View style={styles.roadmapInfo}>
                  <Text style={[styles.roadmapRank, { color: isPast ? r.color : colors.textMuted }]}>
                    {r.name} {isCurrentRank ? '← YOU' : ''}
                  </Text>
                  <Text style={styles.roadmapReq}>
                    Level {r.minLevel} · {rankLevelXp.toLocaleString()} XP
                  </Text>
                </View>
                {isPast && !isCurrentRank && (
                  <Text style={[styles.roadmapCheck, { color: r.color }]}>✓</Text>
                )}
                {isCurrentRank && nextRank && (
                  <Text style={styles.roadmapNext}>
                    Next: lv {nextRank.minLevel}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Recent XP gains */}
      {data.recentGains.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RECENT GAINS</Text>
          <View style={styles.gainsCard}>
            {data.recentGains.map((g, i) => (
              <View key={i} style={[styles.gainRow, i < data.recentGains.length - 1 && styles.gainDivider]}>
                <Text style={styles.gainHabit} numberOfLines={1}>{g.habitName}</Text>
                <View style={styles.gainRight}>
                  <Text style={styles.gainXp}>+{g.xpEarned} XP</Text>
                  <Text style={styles.gainDate}>{formatRelativeDate(g.completedAt)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}



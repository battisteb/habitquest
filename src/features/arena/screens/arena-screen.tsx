import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../../ui/components/pixel-button';
import { PixelFrame } from '../../../ui/components/pixel-frame';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../../ui/theme/tokens';
import { useTheme } from '../../../ui/theme/theme-context';
import { useT, type Strings } from '../../../lib/i18n';
import { getArenaWinChance } from '../../../lib/constants/game-config';
import { fetchArenaState, ackArenaResult, findPlayerId } from '../api';
import type { ArenaState, ArenaFight, ArenaLocked } from '../types';
import { LEAGUE_COLORS, leagueForTier, zoneForPlace, daysLeft } from '../utils/arena-display';
import { Pip } from '../../mascot/components/pip';

function leagueName(T: Strings, tier: number): string {
  return T[`arena_league_${leagueForTier(tier)}` as keyof Strings];
}

function fill(text: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce((acc, [k, v]) => acc.replace(`{${k}}`, String(v)), text);
}

export default function ArenaScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [state, setState] = useState<ArenaState | null>(null);
  const [locked, setLocked] = useState<ArenaLocked | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await fetchArenaState();
      if ('locked' in s) setLocked(s);
      else setState(s);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const dismissResult = () => {
    setState((s) => (s ? { ...s, last_result: null } : s));
    ackArenaResult().catch(() => {
      // Shown again next time: harmless.
    });
  };

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl },
    back: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textSecondary, letterSpacing: 1 },
    header: { gap: spacing.xs },
    title: { fontSize: pixelSize(fontSizes.xxl), fontFamily: fonts.bold, color: colors.text, letterSpacing: 2 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.sm },
    league: { fontSize: pixelSize(fontSizes.lg), fontFamily: fonts.bold, letterSpacing: 1 },
    meta: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textMuted },
    sectionTitle: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, color: colors.textMuted, letterSpacing: 2 },
    card: { padding: spacing.md, gap: spacing.sm },
    fightLine: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.text },
    powers: { flexDirection: 'row', gap: spacing.sm },
    power: { flex: 1, alignItems: 'center', gap: 2 },
    powerValue: { fontSize: pixelSize(fontSizes.xl), fontFamily: fonts.bold },
    powerLabel: { fontSize: fontSizes.xs, color: colors.textMuted, textAlign: 'center' },
    versus: { alignSelf: 'center', fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.textMuted },
    chance: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.accent, textAlign: 'center' },
    tip: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 18 },
    attackedBy: { fontSize: fontSizes.sm, color: colors.textMuted },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs, paddingHorizontal: spacing.sm },
    rowMe: { backgroundColor: colors.primary + '22' },
    place: { width: 28, fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.textMuted },
    name: { flex: 1, fontSize: fontSizes.md, color: colors.text },
    tag: { fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, paddingHorizontal: 4, borderWidth: 1 },
    points: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold, color: colors.text, minWidth: 48, textAlign: 'right' },
    zoneDivider: { fontSize: fontSizes.xs, fontFamily: fonts.bold, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    fightRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    fightRole: { width: 64, fontSize: fontSizes.xs, color: colors.textMuted },
    fightResult: { fontSize: pixelSize(fontSizes.sm), fontFamily: fonts.bold },
    replayBtn: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.surface, borderRadius: 0, paddingHorizontal: 6, paddingVertical: 1 },
    replayText: { color: colors.primary, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
    empty: { fontSize: fontSizes.sm, color: colors.textMuted, fontStyle: 'italic' },
    banner: { padding: spacing.md, gap: spacing.sm, alignItems: 'center' },
    bannerText: { fontSize: pixelSize(fontSizes.md), fontFamily: fonts.bold, color: colors.text, textAlign: 'center' },
    howBody: { fontSize: fontSizes.sm, color: colors.textSecondary, lineHeight: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.md },
  }), [themeKey]);

  const backLink = (
    <Pressable onPress={() => router.back()} accessibilityRole="button">
      <Text style={styles.back}>{T.arena_back}</Text>
    </Pressable>
  );

  if (locked) {
    // Progressive unlock (I6): Pip explains when the arena opens.
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>{backLink}</View>
        <View style={styles.center} testID="arena-locked">
          <Pip expression="happy" mood="calm" size={88} />
          <Text style={styles.empty}>{T.arena_locked.replace('{n}', String(locked.unlock_level))}</Text>
        </View>
      </View>
    );
  }

  if (!state) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.content}>{backLink}</View>
        <View style={styles.center}>
          {error ? (
            <>
              <Text style={styles.empty}>{T.arena_error}</Text>
              <PixelButton title={T.arena_retry} onPress={() => void load()} variant="secondary" />
            </>
          ) : (
            <ActivityIndicator color={colors.primary} testID="arena-loading" />
          )}
        </View>
      </View>
    );
  }

  const leagueColor = LEAGUE_COLORS[leagueForTier(state.tier)];
  const { today } = state;
  const winPct = Math.round(getArenaWinChance(today.attack_power, today.opponent.defense_power) * 100);
  const result = state.last_result;

  const resultText = result
    ? result.to_tier > result.from_tier
      ? fill(T.arena_result_up, { league: leagueName(T, result.to_tier) })
      : result.to_tier < result.from_tier
        ? fill(T.arena_result_down, { league: leagueName(T, result.to_tier) })
        : fill(T.arena_result_stay, { league: leagueName(T, result.to_tier), place: result.place })
    : null;

  const pts = (n: number) => fill(n === 1 ? T.arena_point_one : T.arena_points, { n });
  const nameWithTag = (name: string, isBot: boolean) => (isBot ? `${name} [${T.arena_bot_tag}]` : name);

  // Replay the fight with the battle animation; it ends the way the server decided.
  const replayFight = async (fight: ArenaFight, iWon: boolean) => {
    const opponentId = fight.opponent_is_bot ? null : await findPlayerId(fight.opponent).catch(() => null);
    const level = state.standings.find((st) => st.username === fight.opponent)?.level;
    router.push({
      pathname: '/duels/battle',
      params: {
        replay: iWon ? 'win' : 'lose',
        opponentName: fight.opponent,
        ...(level ? { opponentLevel: String(level) } : {}),
        ...(opponentId ? { opponentId } : {}),
      },
    });
  };

  const renderFight = (fight: ArenaFight, index: number) => {
    // `won` is the attacker's outcome: when defending, a win for them is a loss for me.
    const iWon = fight.role === 'attack' ? fight.won : !fight.won;
    const details = fight.role === 'attack'
      ? [pts(fight.points), fight.gold > 0 ? fill(T.arena_gold, { n: fight.gold }) : null]
      : [];
    return (
      <View key={`${fight.season_day}-${fight.role}-${index}`} style={styles.fightRow}>
        <Text style={styles.fightRole}>
          {fill(T.arena_day, { day: fight.season_day + 1 })} · {fight.role === 'attack' ? T.arena_role_attack : T.arena_role_defense}
        </Text>
        <Text style={styles.name} numberOfLines={1}>{nameWithTag(fight.opponent, fight.opponent_is_bot)}</Text>
        <Text style={[styles.fightResult, { color: iWon ? colors.success : colors.danger }]}>
          {iWon ? T.arena_won : T.arena_lost}
        </Text>
        {details.filter(Boolean).length > 0 && (
          <Text style={styles.attackedBy}>{details.filter(Boolean).join(' ')}</Text>
        )}
        <Pressable
          onPress={() => void replayFight(fight, iWon)}
          style={styles.replayBtn}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={T.arena_replay_btn}
          testID={`arena-replay-${index}`}
        >
          <Text style={styles.replayText}>▶</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {backLink}

        <View style={styles.header}>
          <Text style={styles.title}>{T.arena_title}</Text>
          <View style={styles.headerRow}>
            <Text style={[styles.league, { color: leagueColor }]} testID="arena-league">
              {fill(T.arena_league_label, { league: leagueName(T, state.tier) })}
            </Text>
            <Text style={styles.meta}>
              {fill(T.arena_day, { day: state.day + 1 })} · {fill(T.arena_days_left, { n: daysLeft(state.day) })}
            </Text>
          </View>
        </View>

        {resultText && (
          <PixelFrame borderColor={colors.accent} backgroundColor={colors.surface} contentStyle={styles.banner}>
            <Text style={styles.bannerText} testID="arena-result">{resultText}</Text>
            <PixelButton title={T.arena_result_ok} onPress={dismissResult} variant="secondary" />
          </PixelFrame>
        )}

        <Text style={styles.sectionTitle}>{T.arena_today}</Text>
        <PixelFrame borderColor={leagueColor} backgroundColor={colors.surface} contentStyle={styles.card}>
          <Text style={styles.fightLine}>
            {fill(T.arena_you_attack, { name: nameWithTag(today.opponent.username, today.opponent.is_bot) })}
          </Text>
          <View style={styles.powers}>
            <View style={styles.power}>
              <Text style={[styles.powerValue, { color: colors.success }]} testID="arena-attack">{today.attack_power}</Text>
              <Text style={styles.powerLabel}>{T.arena_attack_power}</Text>
            </View>
            <Text style={styles.versus}>VS</Text>
            <View style={styles.power}>
              <Text style={[styles.powerValue, { color: colors.danger }]}>{today.opponent.defense_power}</Text>
              <Text style={styles.powerLabel}>{T.arena_defense_power}</Text>
            </View>
          </View>
          <Text style={styles.chance}>{fill(T.arena_win_chance, { pct: winPct })}</Text>
          <Text style={styles.tip}>{T.arena_tip}</Text>
          <Text style={styles.attackedBy}>
            {fill(T.arena_attacked_by, { name: nameWithTag(today.attacker.username, today.attacker.is_bot) })}
          </Text>
        </PixelFrame>

        <Text style={styles.sectionTitle}>{T.arena_standings}</Text>
        <PixelFrame backgroundColor={colors.surface} contentStyle={{ paddingVertical: spacing.xs }}>
          {state.standings.map((row) => {
            const zone = zoneForPlace(row.place, state.tier);
            const nextZone = zoneForPlace(row.place + 1, state.tier);
            return (
              <View key={row.place}>
                <View style={[styles.row, row.is_me && styles.rowMe]} testID={row.is_me ? 'arena-me' : undefined}>
                  <Text style={[styles.place, zone === 'promotion' && { color: colors.success }, zone === 'relegation' && { color: colors.danger }]}>
                    #{row.place}
                  </Text>
                  <Text style={styles.name} numberOfLines={1}>{row.username}</Text>
                  {row.is_bot && (
                    <Text style={[styles.tag, { color: colors.textMuted, borderColor: colors.textMuted }]}>{T.arena_bot_tag}</Text>
                  )}
                  {row.is_me && (
                    <Text style={[styles.tag, { color: colors.primary, borderColor: colors.primary }]}>{T.arena_you_tag}</Text>
                  )}
                  <Text style={styles.points}>{pts(row.points)}</Text>
                </View>
                {zone === 'promotion' && nextZone !== 'promotion' && (
                  <Text style={[styles.zoneDivider, { color: colors.success }]}>{T.arena_zone_up}</Text>
                )}
                {zone !== 'relegation' && nextZone === 'relegation' && row.place < state.standings.length && (
                  <Text style={[styles.zoneDivider, { color: colors.danger }]}>{T.arena_zone_down}</Text>
                )}
              </View>
            );
          })}
        </PixelFrame>

        <Text style={styles.sectionTitle}>{T.arena_recent}</Text>
        <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
          {state.recent.length === 0 ? (
            <Text style={styles.empty}>{T.arena_recent_empty}</Text>
          ) : (
            state.recent.map(renderFight)
          )}
        </PixelFrame>

        <Text style={styles.sectionTitle}>{T.arena_how_title}</Text>
        <PixelFrame backgroundColor={colors.surface} contentStyle={styles.card}>
          <Text style={styles.howBody}>{T.arena_how_body}</Text>
        </PixelFrame>
      </ScrollView>
    </View>
  );
}

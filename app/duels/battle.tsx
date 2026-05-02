/**
 * Battle screen — turn-based duel UI (Pokémon-style)
 *
 * Flow per round:
 *  1. PICK   — player selects 1 of up to 4 attacks
 *  2. RESOLVE — opponent "thinks", then both attacks animate one by one
 *  3. Loop back to PICK — or END if someone hits 0 HP
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  Animated, ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { getUnlockedAttacks, ATTACKS, Attack } from '../../src/features/duels/utils/attacks';
import { resolveAttack } from '../../src/features/duels/utils/combat-engine';
import { duelStore$, resolveDuel } from '../../src/features/duels/stores/duel-store';
import { getAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';
import { useT } from '../../src/lib/i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'pick' | 'resolving' | 'end';

interface LivePlayer {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  shield: boolean;
}

interface LogEntry {
  id: number;
  text: string;
  type: 'info' | 'hit' | 'miss' | 'special' | 'round' | 'end';
}

const ME_ID = 'me';
const OPP_ID = 'opp';
let _logId = 0;
const mkLog = (text: string, type: LogEntry['type'] = 'info'): LogEntry =>
  ({ id: _logId++, text, type });

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

// ─── HP Bar ───────────────────────────────────────────────────────────────────

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const barColor = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FFC107' : '#F44336';
  return (
    <View style={hp_s.track}>
      <View style={[hp_s.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}
const hp_s = StyleSheet.create({
  track: { height: 10, backgroundColor: '#0a0a16', borderRadius: 5, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a4a' },
  fill: { height: '100%', borderRadius: 5 },
});

// ─── Character sprite ─────────────────────────────────────────────────────────

function Character({
  player, flip, isAttacking, isHit,
}: {
  player: LivePlayer; flip: boolean; isAttacking: boolean; isHit: boolean;
}) {
  const stage = getAvatarStage(player.level);
  const shakeX = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isHit) {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: flip ? -14 : 14, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: flip ? 14 : -14, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: flip ? -8 : 8, duration: 55, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
      ]).start();
      // Flash
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.2, duration: 80, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
      ]).start();
    }
  }, [isHit]);

  useEffect(() => {
    if (isAttacking) {
      Animated.sequence([
        Animated.timing(slideX, { toValue: flip ? -28 : 28, duration: 100, useNativeDriver: true }),
        Animated.timing(slideX, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [isAttacking]);

  const isDead = player.hp <= 0;

  return (
    <View style={[char_s.wrap, flip && char_s.flip]}>
      <Animated.View style={[char_s.sprite, { transform: [{ translateX: shakeX }, { translateX: slideX }], opacity }]}>
        <View style={[
          char_s.aura,
          {
            borderColor: isDead ? '#333' : stage.aura,
            backgroundColor: isDead ? '#111' : stage.aura + '25',
          },
        ]}>
          <Text style={[char_s.emoji, isDead && char_s.dead]}>{isDead ? '💀' : stage.emoji}</Text>
        </View>
        {player.shield && !isDead && (
          <Text style={char_s.shieldIcon}>🛡️</Text>
        )}
      </Animated.View>
    </View>
  );
}
const char_s = StyleSheet.create({
  wrap: { alignItems: 'center' },
  flip: { transform: [{ scaleX: -1 }] },
  sprite: { alignItems: 'center', justifyContent: 'center' },
  aura: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 42 },
  dead: { opacity: 0.4 },
  shieldIcon: { position: 'absolute', bottom: -4, right: -4, fontSize: 18 },
});

// ─── Player info panel ────────────────────────────────────────────────────────

function PlayerPanel({ player, align, hpLabel }: { player: LivePlayer; align: 'left' | 'right'; hpLabel: string }) {
  const stage = getAvatarStage(player.level);
  const isRight = align === 'right';
  return (
    <View style={[panel_s.wrap, isRight && panel_s.wrapRight]}>
      <View style={[panel_s.nameRow, isRight && panel_s.nameRowRight]}>
        <Text style={panel_s.name} numberOfLines={1}>{player.name}</Text>
        <View style={[panel_s.badge, { backgroundColor: stage.aura + '33', borderColor: stage.aura }]}>
          <Text style={[panel_s.badgeText, { color: stage.aura }]}>Lv.{player.level}</Text>
        </View>
      </View>
      <HpBar hp={player.hp} maxHp={player.maxHp} />
      <Text style={[panel_s.hpNum, isRight && panel_s.hpNumRight]}>
        {hpLabel}
      </Text>
    </View>
  );
}
const panel_s = StyleSheet.create({
  wrap: { flex: 1, gap: 4 },
  wrapRight: { alignItems: 'flex-end' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameRowRight: { flexDirection: 'row-reverse' },
  name: { color: colors.text, fontSize: fontSizes.sm, fontWeight: 'bold', flexShrink: 1 },
  badge: { borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 1 },
  badgeText: { fontSize: 9, fontWeight: 'bold' },
  hpNum: { color: colors.textMuted, fontSize: 9 },
  hpNumRight: { textAlign: 'right' },
});

// ─── Attack button ────────────────────────────────────────────────────────────

function AttackBtn({
  attack, selected, onPress, disabled,
}: { attack: Attack; selected: boolean; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      style={[atk_s.btn, selected && atk_s.selected, disabled && atk_s.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={atk_s.emoji}>{attack.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={atk_s.name}>{attack.name}</Text>
        <Text style={atk_s.stats}>
          💥 {attack.baseDamage} · 🎯 {Math.round(attack.hitChance * 100)}%
          {attack.special ? `  ★ ${attack.special}` : ''}
        </Text>
      </View>
      {selected && <Text style={atk_s.check}>✓</Text>}
    </Pressable>
  );
}
const atk_s = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    borderRadius: 6, borderBottomWidth: 4, padding: spacing.sm,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accent + '18', borderBottomColor: '#c9a400' },
  disabled: { opacity: 0.35 },
  emoji: { fontSize: 22 },
  name: { color: colors.text, fontSize: fontSizes.sm, fontWeight: 'bold' },
  stats: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  check: { color: colors.accent, fontSize: fontSizes.md, fontWeight: 'bold' },
});

// ─── Log line ─────────────────────────────────────────────────────────────────

const LOG_COLORS: Record<LogEntry['type'], string> = {
  info: colors.textSecondary,
  hit: colors.text,
  miss: colors.textMuted,
  special: '#FFD700',
  round: colors.primary,
  end: colors.accent,
};

function LogLine({ entry, isNew }: { entry: LogEntry; isNew: boolean }) {
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(isNew ? 8 : 0)).current;
  useEffect(() => {
    if (isNew) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, []);
  return (
    <Animated.Text
      style={[log_s.line, { color: LOG_COLORS[entry.type], opacity, transform: [{ translateY }] }]}
    >
      {entry.text}
    </Animated.Text>
  );
}
const log_s = StyleSheet.create({
  line: { fontSize: fontSizes.sm, lineHeight: 22 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BattleScreen() {
  const T = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    opponentName?: string; opponentLevel?: string;
    myName?: string; myLevel?: string; openingAttackId?: string;
    duelId?: string; opponentId?: string;
  }>();
  const formatHp = (hp: number, max: number) =>
    T.duels_battle_hp.replace('{hp}', String(hp)).replace('{max}', String(max));

  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const allAttacks = getUnlockedAttacks(unlockedCategories).slice(0, 4);
  const myAttacks = allAttacks.length > 0
    ? allAttacks
    : [ATTACKS.find(a => a.id === 'balanced_attack')!];

  const myLevel = parseInt(params.myLevel ?? '8', 10);
  const oppLevel = parseInt(params.opponentLevel ?? '6', 10);

  const [round, setRound] = useState(1);
  const [me, setMe] = useState<LivePlayer>({
    id: ME_ID, name: params.myName ?? T.duels_battle_default_you,
    level: myLevel, hp: 100, maxHp: 100, shield: false,
  });
  const [opp, setOpp] = useState<LivePlayer>({
    id: OPP_ID, name: params.opponentName ?? T.duels_battle_default_rival,
    level: oppLevel, hp: 100, maxHp: 100, shield: false,
  });

  const [phase, setPhase] = useState<Phase>('pick');
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(
    params.openingAttackId ?? null,
  );
  const [log, setLog] = useState<LogEntry[]>([mkLog(T.duels_battle_start, 'round')]);
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitId, setHitId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null | 'draw'>('draw'); // initial dummy
  const [xpBonus, setXpBonus] = useState(0);

  const logScrollRef = useRef<ScrollView>(null);

  // Use refs to avoid stale closures inside async callback
  const meRef = useRef(me);
  const oppRef = useRef(opp);
  useEffect(() => { meRef.current = me; }, [me]);
  useEffect(() => { oppRef.current = opp; }, [opp]);

  const pushLog = useCallback((text: string, type: LogEntry['type'] = 'info') => {
    setLog(prev => [...prev, mkLog(text, type)]);
    setTimeout(() => logScrollRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const handleFight = useCallback(async () => {
    if (!selectedAttackId || phase !== 'pick') return;

    const myAtk = myAttacks.find(a => a.id === selectedAttackId) ?? myAttacks[0];
    const oppAtk = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];

    setPhase('resolving');
    pushLog(T.duels_battle_opp_thinking.replace('{name}', oppRef.current.name), 'info');
    await delay(900);
    pushLog(
      T.duels_battle_opp_chose
        .replace('{name}', oppRef.current.name)
        .replace('{emoji}', oppAtk.emoji)
        .replace('{attack}', oppAtk.name),
      'info',
    );
    await delay(500);

    // Work on mutable local copies
    let curMe = { ...meRef.current };
    let curOpp = { ...oppRef.current };
    const goFirst = myLevel >= oppLevel ? ME_ID : OPP_ID;

    const doAttack = async (attackerId: string, atk: Attack, defenderId: string) => {
      const attacker = attackerId === ME_ID ? curMe : curOpp;
      const defender = defenderId === ME_ID ? curMe : curOpp;
      if (defender.hp <= 0) return;

      const result = resolveAttack(atk, attacker.level - defender.level);

      setAttackingId(attackerId);
      await delay(320);
      setAttackingId(null);

      if (result.hit) {
        if (defender.shield) {
          result.damage = 0;
          result.effect += T.duels_battle_blocked;
          if (defenderId === ME_ID) curMe = { ...curMe, shield: false };
          else curOpp = { ...curOpp, shield: false };
        } else {
          if (defenderId === ME_ID) curMe = { ...curMe, hp: Math.max(0, curMe.hp - result.damage) };
          else curOpp = { ...curOpp, hp: Math.max(0, curOpp.hp - result.damage) };
        }
        setHitId(defenderId);
        await delay(110);
        setHitId(null);
        pushLog(result.effect, result.damage === 0 ? 'miss' : result.shieldApplied || result.healAmount ? 'special' : 'hit');
      } else {
        pushLog(result.effect, 'miss');
      }

      if (result.shieldApplied) {
        if (attackerId === ME_ID) curMe = { ...curMe, shield: true };
        else curOpp = { ...curOpp, shield: true };
        pushLog(T.duels_battle_shield_up.replace('{name}', attacker.name), 'special');
      }
      if (result.healAmount) {
        if (attackerId === ME_ID) curMe = { ...curMe, hp: Math.min(curMe.maxHp, curMe.hp + result.healAmount) };
        else curOpp = { ...curOpp, hp: Math.min(curOpp.maxHp, curOpp.hp + result.healAmount) };
        pushLog(
          T.duels_battle_healed
            .replace('{name}', attacker.name)
            .replace('{n}', String(result.healAmount)),
          'special',
        );
      }

      setMe({ ...curMe });
      setOpp({ ...curOpp });
      await delay(800);
    };

    if (goFirst === ME_ID) {
      await doAttack(ME_ID, myAtk, OPP_ID);
      if (curOpp.hp > 0) await doAttack(OPP_ID, oppAtk, ME_ID);
    } else {
      await doAttack(OPP_ID, oppAtk, ME_ID);
      if (curMe.hp > 0) await doAttack(ME_ID, myAtk, OPP_ID);
    }

    const ko = curMe.hp <= 0 || curOpp.hp <= 0;

    if (!ko) {
      setRound(r => r + 1);
      pushLog(T.duels_battle_round_over, 'round');
      setSelectedAttackId(null);
      setPhase('pick');
      return;
    }

    // ── End ──
    let winner: string | null | 'draw' = null;
    if (curMe.hp <= 0 && curOpp.hp <= 0) winner = 'draw';
    else if (curOpp.hp <= 0) winner = ME_ID;
    else winner = OPP_ID;

    const levelDiff = Math.abs(myLevel - oppLevel);
    const bonus = 20 + levelDiff * 5;
    setXpBonus(bonus);
    setWinnerId(winner);

    // Award gold/XP and persist result (non-blocking)
    if (winner !== 'draw') {
      const winnerId = winner === ME_ID ? ME_ID : OPP_ID;
      const loserId = winner === ME_ID ? OPP_ID : ME_ID;
      resolveDuel(params.duelId ?? null, winnerId, loserId).catch(() => {});
    }

    const endMsg =
      winner === ME_ID ? T.duels_battle_msg_win
      : winner === 'draw' ? T.duels_battle_msg_draw
      : T.duels_battle_msg_lose;
    pushLog(endMsg, 'end');
    await delay(600);
    setPhase('end');
  }, [selectedAttackId, phase, myAttacks, myLevel, oppLevel, pushLog, T]);

  const isPickPhase = phase === 'pick';
  const isEnd = phase === 'end';

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* ── Top bar: round counter ── */}
      <View style={s.topBar}>
        <Text style={s.roundLabel}>{T.duels_battle_round.replace('{n}', String(round))}</Text>
        <Text style={s.roundSub}>
          {phase === 'pick' ? T.duels_battle_phase_pick : phase === 'resolving' ? T.duels_battle_phase_resolving : isEnd ? T.duels_battle_phase_end : ''}
        </Text>
      </View>

      {/* ── Arena ── */}
      <View style={s.arena}>
        {/* Opponent left */}
        <View style={s.arenaSlot}>
          <PlayerPanel player={opp} align="left" hpLabel={formatHp(opp.hp, opp.maxHp)} />
          <Character
            player={opp}
            flip={false}
            isAttacking={attackingId === OPP_ID}
            isHit={hitId === OPP_ID}
          />
        </View>

        <View style={s.vsDivider}>
          <Text style={s.vsText}>VS</Text>
        </View>

        {/* Me right */}
        <View style={[s.arenaSlot, s.arenaSlotRight]}>
          <Character
            player={me}
            flip={true}
            isAttacking={attackingId === ME_ID}
            isHit={hitId === ME_ID}
          />
          <PlayerPanel player={me} align="right" hpLabel={formatHp(me.hp, me.maxHp)} />
        </View>
      </View>

      {/* ── Battle log ── */}
      <ScrollView
        ref={logScrollRef}
        style={s.logScroll}
        contentContainerStyle={s.logContent}
        showsVerticalScrollIndicator={false}
      >
        {log.map((entry, i) => (
          <LogLine key={entry.id} entry={entry} isNew={i === log.length - 1} />
        ))}
      </ScrollView>

      {/* ── Bottom panel ── */}
      {!isEnd ? (
        <View style={s.bottomPanel}>
          <Text style={s.panelHeader}>
            {isPickPhase ? T.duels_battle_panel_pick : T.duels_battle_panel_thinking}
          </Text>
          <View style={s.attackGrid}>
            {myAttacks.map(atk => (
              <AttackBtn
                key={atk.id}
                attack={atk}
                selected={selectedAttackId === atk.id}
                onPress={() => isPickPhase && setSelectedAttackId(atk.id)}
                disabled={!isPickPhase}
              />
            ))}
          </View>
          <Pressable
            style={[s.fightBtn, (!selectedAttackId || !isPickPhase) && s.fightBtnOff]}
            onPress={handleFight}
            disabled={!selectedAttackId || !isPickPhase}
          >
            <Text style={s.fightBtnText}>
              {isPickPhase ? T.duels_battle_btn_fight : T.duels_battle_btn_resolving}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.endPanel}>
          <Text style={s.endTitle}>
            {winnerId === ME_ID ? T.duels_battle_end_victory
              : winnerId === 'draw' ? T.duels_battle_end_draw
              : T.duels_battle_end_defeat}
          </Text>
          <View style={s.rewardBox}>
            {winnerId === ME_ID ? (
              <>
                <Text style={s.rewardLine}>{T.duels_battle_reward_cosmetic}</Text>
                <Text style={s.rewardLine}>{T.duels_battle_reward_achievement}</Text>
              </>
            ) : winnerId === 'draw' ? (
              <Text style={s.rewardLine}>
                {T.duels_battle_reward_draw.replace('{n}', String(Math.round(xpBonus * 0.5)))}
              </Text>
            ) : (
              <>
                <Text style={s.rewardLine}>{T.duels_battle_reward_xp.replace('{n}', String(xpBonus))}</Text>
                <Text style={s.rewardLine}>{T.duels_battle_reward_stronger}</Text>
              </>
            )}
          </View>
          <Pressable style={s.exitBtn} onPress={() => router.replace('/duels')}>
            <Text style={s.exitBtnText}>{T.duels_battle_back_arena}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08081A' },

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 6,
    backgroundColor: '#0f0f22', borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  roundLabel: { color: colors.accent, fontSize: fontSizes.sm, fontWeight: 'bold', letterSpacing: 2 },
  roundSub: { color: colors.textMuted, fontSize: fontSizes.xs },

  // Arena
  arena: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    backgroundColor: '#0c0c1e',
    borderBottomWidth: 2, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  arenaSlot: { flex: 1, gap: spacing.sm },
  arenaSlotRight: { alignItems: 'flex-end' },
  vsDivider: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  vsText: { color: colors.textMuted, fontSize: 9, fontWeight: 'bold', letterSpacing: 1 },

  // Log
  logScroll: { flex: 1, backgroundColor: '#09091a' },
  logContent: { padding: spacing.md, gap: 2 },

  // Bottom panel
  bottomPanel: {
    backgroundColor: '#0f0f22',
    borderTopWidth: 2, borderTopColor: colors.border,
    padding: spacing.md, gap: spacing.sm,
  },
  panelHeader: {
    color: colors.textMuted, fontSize: fontSizes.xs,
    fontWeight: 'bold', letterSpacing: 2,
  },
  attackGrid: { gap: spacing.xs },
  fightBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6, borderBottomWidth: 4, borderColor: colors.primaryDark,
    padding: spacing.md, alignItems: 'center', marginTop: 4,
  },
  fightBtnOff: { opacity: 0.3 },
  fightBtnText: { color: '#fff', fontSize: fontSizes.md, fontWeight: 'bold', letterSpacing: 2 },

  // End panel
  endPanel: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: spacing.xl, gap: spacing.lg,
    backgroundColor: '#09091a',
  },
  endTitle: {
    color: colors.accent, fontSize: fontSizes.xxl,
    fontWeight: 'bold', letterSpacing: 3,
  },
  rewardBox: {
    backgroundColor: colors.surface, borderWidth: 2,
    borderColor: colors.border, borderRadius: 8,
    padding: spacing.md, gap: spacing.sm, width: '100%', alignItems: 'center',
  },
  rewardLine: { color: colors.text, fontSize: fontSizes.md, textAlign: 'center' },
  exitBtn: {
    backgroundColor: colors.surface, borderWidth: 2,
    borderColor: colors.primary, borderRadius: 6,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  exitBtnText: { color: colors.primary, fontSize: fontSizes.sm, fontWeight: 'bold', letterSpacing: 1 },
});

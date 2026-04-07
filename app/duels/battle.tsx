/**
 * Battle screen — turn-based duel UI (Pokémon-style)
 *
 * Flow:
 *  1. PICK phase: player selects one of up to 4 attacks
 *  2. RESOLVING phase: opponent "thinks" 1.2s, then both attacks resolve
 *     - Each round event is shown one at a time with a 1.4s delay
 *  3. END phase: winner screen + rewards
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { getUnlockedAttacks, ATTACKS, Attack } from '../../src/features/duels/utils/attacks';
import { resolveAttack, PlayerState, RoundResult } from '../../src/features/duels/utils/combat-engine';
import { duelStore$ } from '../../src/features/duels/stores/duel-store';
import { getAvatarStage } from '../../src/features/avatar/utils/avatar-evolution';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'pick' | 'resolving' | 'showing' | 'end';

interface LivePlayer {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  shield: boolean;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function HpBar({ hp, maxHp, color }: { hp: number; maxHp: number; color: string }) {
  const pct = Math.max(0, Math.min(1, hp / maxHp));
  const barColor = pct > 0.5 ? '#4CAF50' : pct > 0.25 ? '#FFC107' : '#F44336';
  return (
    <View style={hpStyles.track}>
      <View style={[hpStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}
const hpStyles = StyleSheet.create({
  track: { height: 8, backgroundColor: '#1a1a2e', borderRadius: 4, overflow: 'hidden', borderWidth: 1, borderColor: '#2a2a4a' },
  fill: { height: '100%', borderRadius: 4 },
});

function CharacterBox({
  player,
  isMe,
  isAttacking,
  isHit,
  hasShield,
}: {
  player: LivePlayer;
  isMe: boolean;
  isAttacking: boolean;
  isHit: boolean;
  hasShield: boolean;
}) {
  const stage = getAvatarStage(player.level);
  const shakeX = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isHit) {
      Animated.sequence([
        Animated.timing(shakeX, { toValue: isMe ? -12 : 12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: isMe ? 12 : -12, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: isMe ? -8 : 8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeX, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [isHit]);

  useEffect(() => {
    if (isAttacking) {
      Animated.sequence([
        Animated.timing(slideX, { toValue: isMe ? 30 : -30, duration: 120, useNativeDriver: true }),
        Animated.timing(slideX, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [isAttacking]);

  return (
    <View style={[charStyles.container, isMe ? charStyles.meContainer : charStyles.oppContainer]}>
      {!isMe && (
        <View style={charStyles.info}>
          <Text style={charStyles.name}>{player.name}</Text>
          <Text style={charStyles.level}>Lv.{player.level} · {stage.title}</Text>
          <HpBar hp={player.hp} maxHp={player.maxHp} color={stage.aura} />
          <Text style={charStyles.hpText}>{player.hp}/{player.maxHp} HP</Text>
        </View>
      )}

      <Animated.View style={[charStyles.sprite, { transform: [{ translateX: shakeX }, { translateX: slideX }] }]}>
        <View style={[charStyles.aura, { borderColor: stage.aura + (hasShield ? 'ff' : '60'), backgroundColor: stage.aura + (hasShield ? '40' : '15') }]}>
          <Text style={charStyles.emoji}>{stage.emoji}</Text>
        </View>
        {hasShield && <Text style={charStyles.shieldBadge}>🛡️</Text>}
      </Animated.View>

      {isMe && (
        <View style={charStyles.info}>
          <Text style={charStyles.name}>{player.name}</Text>
          <Text style={charStyles.level}>Lv.{player.level} · {stage.title}</Text>
          <HpBar hp={player.hp} maxHp={player.maxHp} color={stage.aura} />
          <Text style={charStyles.hpText}>{player.hp}/{player.maxHp} HP</Text>
        </View>
      )}
    </View>
  );
}
const charStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  meContainer: { flexDirection: 'row-reverse' },
  oppContainer: { flexDirection: 'row' },
  info: { flex: 1, gap: 4 },
  name: { color: colors.text, fontSize: fontSizes.sm, fontWeight: 'bold', letterSpacing: 1 },
  level: { color: colors.textMuted, fontSize: fontSizes.xs },
  hpText: { color: colors.textSecondary, fontSize: fontSizes.xs },
  sprite: { alignItems: 'center', justifyContent: 'center' },
  aura: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, alignItems: 'center', justifyContent: 'center',
  },
  emoji: { fontSize: 38 },
  shieldBadge: { position: 'absolute', top: -4, right: -4, fontSize: 16 },
});

// ─── Attack button ────────────────────────────────────────────────────────────

function AttackBtn({ attack, selected, onPress, disabled }: { attack: Attack; selected: boolean; onPress: () => void; disabled: boolean }) {
  return (
    <Pressable
      style={[atkStyles.btn, selected && atkStyles.selected, disabled && atkStyles.disabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={atkStyles.emoji}>{attack.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={atkStyles.name}>{attack.name}</Text>
        <Text style={atkStyles.stats}>
          💥{attack.baseDamage} · 🎯{Math.round(attack.hitChance * 100)}%
          {attack.special ? ` · ★${attack.special}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}
const atkStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border,
    borderRadius: 6, borderBottomWidth: 4, padding: spacing.sm,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accent + '22', borderBottomColor: colors.accent },
  disabled: { opacity: 0.4 },
  emoji: { fontSize: 24 },
  name: { color: colors.text, fontSize: fontSizes.sm, fontWeight: 'bold' },
  stats: { color: colors.textMuted, fontSize: fontSizes.xs, marginTop: 1 },
});

// ─── Battle log line ──────────────────────────────────────────────────────────

function LogLine({ text, isNew }: { text: string; isNew: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (isNew) {
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      opacity.setValue(1);
    }
  }, [isNew]);
  return (
    <Animated.Text style={[logStyles.line, { opacity }]}>{text}</Animated.Text>
  );
}
const logStyles = StyleSheet.create({
  line: { color: colors.text, fontSize: fontSizes.sm, lineHeight: 20 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ME_ID = 'me';
const OPP_ID = 'opp';

export default function BattleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ opponentName?: string; opponentLevel?: string; myName?: string; myLevel?: string; openingAttackId?: string }>();

  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const allAttacks = getUnlockedAttacks(unlockedCategories).slice(0, 4); // max 4
  // ensure at least 1 attack
  const myAttacks = allAttacks.length > 0 ? allAttacks : [ATTACKS.find(a => a.id === 'balanced_attack')!];

  const myLevel = parseInt(params.myLevel ?? '8', 10);
  const oppLevel = parseInt(params.opponentLevel ?? '6', 10);

  const [me, setMe] = useState<LivePlayer>({
    id: ME_ID, name: params.myName ?? 'You', level: myLevel, hp: 100, maxHp: 100, shield: false,
  });
  const [opp, setOpp] = useState<LivePlayer>({
    id: OPP_ID, name: params.opponentName ?? 'Rival', level: oppLevel, hp: 100, maxHp: 100, shield: false,
  });

  const [phase, setPhase] = useState<Phase>('pick');
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(params.openingAttackId ?? null);
  const [logLines, setLogLines] = useState<string[]>(['⚔️ Battle start! Choose your attack.']);
  const [newLineIdx, setNewLineIdx] = useState(0);
  const [attackingId, setAttackingId] = useState<string | null>(null);
  const [hitId, setHitId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [xpBonus, setXpBonus] = useState(0);

  const addLog = useCallback((line: string, idx: number) => {
    setLogLines(prev => [...prev, line]);
    setNewLineIdx(idx);
  }, []);

  const handleFight = useCallback(async () => {
    if (!selectedAttackId || phase !== 'pick') return;

    const myAtk = myAttacks.find(a => a.id === selectedAttackId) ?? myAttacks[0];
    const oppAtk = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];

    setPhase('resolving');
    addLog(`🤔 ${opp.name} is choosing...`, logLines.length);

    await delay(1200);
    addLog(`${opp.name} chose ${oppAtk.emoji} ${oppAtk.name}!`, logLines.length + 1);

    await delay(700);
    setPhase('showing');

    // Determine turn order: higher level goes first
    const order: Array<{ attacker: LivePlayer; attack: Attack; defenderId: string }> =
      myLevel >= oppLevel
        ? [{ attacker: me, attack: myAtk, defenderId: OPP_ID }, { attacker: opp, attack: oppAtk, defenderId: ME_ID }]
        : [{ attacker: opp, attack: oppAtk, defenderId: ME_ID }, { attacker: me, attack: myAtk, defenderId: OPP_ID }];

    let currentMe = { ...me };
    let currentOpp = { ...opp };

    let logIdx = logLines.length + 2;

    for (const { attacker, attack, defenderId } of order) {
      const defender = defenderId === ME_ID ? currentMe : currentOpp;
      if (defender.hp <= 0) break;

      const levelAdv = attacker.level - defender.level;
      const result = resolveAttack(attack, levelAdv);

      // Show attacker lunging
      setAttackingId(attacker.id);
      await delay(400);
      setAttackingId(null);

      if (result.hit) {
        // Shield block?
        if (defender.shield) {
          result.damage = 0;
          result.effect += ' (blocked by shield!)';
          if (defenderId === ME_ID) currentMe = { ...currentMe, shield: false };
          else currentOpp = { ...currentOpp, shield: false };
        } else {
          if (defenderId === ME_ID) {
            currentMe = { ...currentMe, hp: Math.max(0, currentMe.hp - result.damage) };
          } else {
            currentOpp = { ...currentOpp, hp: Math.max(0, currentOpp.hp - result.damage) };
          }
        }
        setHitId(defenderId);
        await delay(150);
        setHitId(null);
      }

      if (result.shieldApplied) {
        if (attacker.id === ME_ID) currentMe = { ...currentMe, shield: true };
        else currentOpp = { ...currentOpp, shield: true };
      }
      if (result.healAmount) {
        if (attacker.id === ME_ID) {
          currentMe = { ...currentMe, hp: Math.min(100, currentMe.hp + result.healAmount) };
        } else {
          currentOpp = { ...currentOpp, hp: Math.min(100, currentOpp.hp + result.healAmount) };
        }
      }

      setMe(currentMe);
      setOpp(currentOpp);
      addLog(result.effect, logIdx++);
      await delay(1200);
    }

    // Determine winner
    let winner: string | null = null;
    if (currentMe.hp > currentOpp.hp) winner = ME_ID;
    else if (currentOpp.hp > currentMe.hp) winner = OPP_ID;

    const levelDiff = Math.abs(myLevel - oppLevel);
    const bonus = 20 + levelDiff * 5;
    setXpBonus(bonus);
    setWinnerId(winner);

    const endMsg = winner === ME_ID ? '🏆 YOU WIN!' : winner === null ? '🤝 DRAW!' : '💀 YOU WERE DEFEATED!';
    addLog(endMsg, logIdx++);

    await delay(800);
    setPhase('end');
  }, [selectedAttackId, phase, me, opp, myAttacks, logLines.length]);

  const isPickPhase = phase === 'pick';
  const isEnd = phase === 'end';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Arena ── */}
      <View style={styles.arena}>
        <CharacterBox
          player={opp}
          isMe={false}
          isAttacking={attackingId === OPP_ID}
          isHit={hitId === OPP_ID}
          hasShield={opp.shield}
        />
        <View style={styles.vsLabel}>
          <Text style={styles.vsText}>VS</Text>
        </View>
        <CharacterBox
          player={me}
          isMe={true}
          isAttacking={attackingId === ME_ID}
          isHit={hitId === ME_ID}
          hasShield={me.shield}
        />
      </View>

      {/* ── Battle log ── */}
      <View style={styles.log}>
        {logLines.slice(-3).map((line, i, arr) => (
          <LogLine key={i} text={line} isNew={i === arr.length - 1} />
        ))}
      </View>

      {/* ── Attack panel / End panel ── */}
      {!isEnd ? (
        <View style={styles.attackPanel}>
          <Text style={styles.panelTitle}>
            {isPickPhase ? 'CHOOSE ATTACK' : '...'}
          </Text>
          <View style={styles.attackGrid}>
            {myAttacks.map((atk) => (
              <AttackBtn
                key={atk.id}
                attack={atk}
                selected={selectedAttackId === atk.id}
                onPress={() => setSelectedAttackId(atk.id)}
                disabled={!isPickPhase}
              />
            ))}
          </View>
          <Pressable
            style={[styles.fightBtn, (!selectedAttackId || !isPickPhase) && styles.fightBtnDisabled]}
            onPress={handleFight}
            disabled={!selectedAttackId || !isPickPhase}
          >
            <Text style={styles.fightBtnText}>
              {isPickPhase ? '⚔️  FIGHT!' : '⏳  Resolving...'}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.endPanel}>
          <Text style={styles.endTitle}>
            {winnerId === ME_ID ? '🏆 VICTORY!' : winnerId === null ? '🤝 DRAW' : '💀 DEFEAT'}
          </Text>
          {winnerId === ME_ID ? (
            <>
              <Text style={styles.endReward}>🎨 Cosmetic unlocked in Shop</Text>
              <Text style={styles.endReward}>🏅 Victory achievement earned</Text>
            </>
          ) : (
            <>
              <Text style={styles.endReward}>📈 +{xpBonus} XP catch-up bonus</Text>
              <Text style={styles.endReward}>💪 Defeat makes you stronger!</Text>
            </>
          )}
          {winnerId === null && <Text style={styles.endReward}>+{Math.round(xpBonus * 0.5)} XP for both fighters</Text>}
          <Pressable style={styles.exitBtn} onPress={() => router.replace('/duels')}>
            <Text style={styles.exitBtnText}>← Back to Arena</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise<void>(resolve => setTimeout(resolve, ms));
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a16',
  },

  // Arena
  arena: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: '#0f0f20',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  vsLabel: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 1,
  },

  // Log
  log: {
    minHeight: 80,
    backgroundColor: '#0d0d1c',
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    padding: spacing.md,
    gap: 4,
    justifyContent: 'flex-end',
  },

  // Attack panel
  attackPanel: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  panelTitle: {
    color: colors.textMuted,
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  attackGrid: {
    flex: 1,
    gap: spacing.sm,
  },
  fightBtn: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    borderBottomWidth: 4,
    borderColor: colors.primaryDark,
    padding: spacing.md,
    alignItems: 'center',
  },
  fightBtnDisabled: {
    opacity: 0.35,
  },
  fightBtnText: {
    color: '#fff',
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    letterSpacing: 2,
  },

  // End panel
  endPanel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  endTitle: {
    color: colors.accent,
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    letterSpacing: 3,
    textAlign: 'center',
  },
  endReward: {
    color: colors.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
    lineHeight: 24,
  },
  exitBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitBtnText: {
    color: colors.primary,
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

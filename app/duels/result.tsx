import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { ATTACKS, getUnlockedAttacks } from '../../src/features/duels/utils/attacks';
import { simulateDuel, PlayerState } from '../../src/features/duels/utils/combat-engine';
import { duelStore$ } from '../../src/features/duels/stores/duel-store';

export default function DuelResultScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const myAttacks = getUnlockedAttacks(unlockedCategories);
  const [selectedMyAttack, setSelectedMyAttack] = useState(myAttacks[0]?.id ?? 'balanced_attack');
  const [simResult, setSimResult] = useState<ReturnType<typeof simulateDuel> | null>(null);

  const me: PlayerState = { id: 'me', name: 'You', level: 8, hp: 100, shield: false };
  const opponent: PlayerState = { id: 'opp', name: 'Rival', level: 6, hp: 100, shield: false };

  const runSim = () => {
    const myAtk = ATTACKS.find((a) => a.id === selectedMyAttack) ?? ATTACKS[0];
    const oppAtk = ATTACKS[Math.floor(Math.random() * ATTACKS.length)];
    const result = simulateDuel({ ...me }, { ...opponent }, myAtk, oppAtk);
    setSimResult(result);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />
      <Text style={styles.title}>DUEL SIMULATOR</Text>
      <Text style={styles.sub}>Test the combat engine (demo)</Text>

      <Text style={styles.stepLabel}>CHOOSE YOUR ATTACK</Text>
      <View style={styles.attackRow}>
        {myAttacks.map((a) => (
          <Pressable
            key={a.id}
            style={[styles.atkBtn, selectedMyAttack === a.id && styles.atkBtnSelected]}
            onPress={() => setSelectedMyAttack(a.id)}
          >
            <Text>{a.emoji}</Text>
            <Text style={styles.atkBtnLabel}>{a.name}</Text>
          </Pressable>
        ))}
      </View>

      <PixelButton title="FIGHT!" onPress={runSim} style={{ marginVertical: spacing.md }} />

      {simResult && (
        <View style={styles.result}>
          <Text style={styles.resultTitle}>
            {simResult.winnerId === 'me'
              ? 'YOU WIN!'
              : simResult.winnerId === null
                ? 'DRAW!'
                : 'YOU LOSE!'}
          </Text>
          {simResult.rounds.map((r, i) => (
            <View key={i} style={styles.round}>
              <Text style={styles.roundLabel}>
                Round {i + 1} — {r.attackerId === 'me' ? 'You' : 'Rival'} used {r.attackName}
              </Text>
              <Text style={[styles.roundEffect, { color: r.result.hit ? colors.text : colors.textMuted }]}>
                {r.result.effect}
              </Text>
              <Text style={styles.roundHp}>
                HP → You: {r.hpAfter['me']} | Rival: {r.hpAfter['opp']}
              </Text>
            </View>
          ))}
          <View style={styles.rewards}>
            <Text style={styles.rewardTitle}>REWARDS</Text>
            {simResult.winnerId === 'me' ? (
              <>
                <Text style={styles.rewardItem}>Victory Achievement unlocked</Text>
                <Text style={styles.rewardItem}>Cosmetic reward available in Shop</Text>
              </>
            ) : (
              <>
                <Text style={styles.rewardItem}>+{simResult.loserXpBonus} XP (catch-up bonus)</Text>
                <Text style={styles.rewardItem}>Defeat only makes you stronger!</Text>
              </>
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { fontSize: fontSizes.xl, fontWeight: 'bold', color: colors.text, letterSpacing: 2 },
  sub: { fontSize: fontSizes.xs, color: colors.textMuted },
  stepLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    marginTop: spacing.md,
  },
  attackRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  atkBtn: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 70,
  },
  atkBtnSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '18' },
  atkBtnLabel: { color: colors.text, fontSize: 9, fontWeight: 'bold', textAlign: 'center', marginTop: 2 },
  result: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.md,
    gap: spacing.sm,
  },
  resultTitle: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.accent,
    letterSpacing: 2,
    textAlign: 'center',
  },
  round: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.xs, gap: 2 },
  roundLabel: { color: colors.textMuted, fontSize: fontSizes.xs, fontWeight: 'bold' },
  roundEffect: { fontSize: fontSizes.sm },
  roundHp: { color: colors.textSecondary, fontSize: fontSizes.xs },
  rewards: {
    backgroundColor: colors.accent + '18',
    borderRadius: 4,
    padding: spacing.sm,
    gap: 4,
  },
  rewardTitle: { color: colors.accent, fontSize: fontSizes.xs, fontWeight: 'bold', letterSpacing: 1 },
  rewardItem: { color: colors.text, fontSize: fontSizes.sm },
});

import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';
import { friendsStore$, fetchFriends } from '../../src/features/social/stores/friends-store';
import { duelStore$, fetchUnlockedCategories, createDuel } from '../../src/features/duels/stores/duel-store';
import { getUnlockedAttacks } from '../../src/features/duels/utils/attacks';
import { useTheme } from '../../src/ui/theme/theme-context';

export default function ChallengeScreen() {
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  stepLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  hint: { color: colors.textMuted, fontSize: fontSizes.sm, fontStyle: 'italic' },
  friendChip: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    padding: spacing.sm,
    alignItems: 'center',
    minWidth: 80,
    gap: 2,
  },
  friendChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  friendEmoji: { fontSize: 28 },
  friendName: { color: colors.text, fontSize: fontSizes.xs, fontWeight: 'bold' },
  friendNameSelected: { color: colors.primary },
  friendLevel: { color: colors.textMuted, fontSize: 9 },
  attackCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    borderBottomWidth: 4,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  attackCardSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '18' },
  atkEmoji: { fontSize: 32 },
  atkName: { color: colors.text, fontSize: fontSizes.xs, fontWeight: 'bold', textAlign: 'center' },
  atkDesc: { color: colors.textMuted, fontSize: 9, textAlign: 'center', lineHeight: 12 },
  atkStats: { flexDirection: 'row', gap: spacing.sm },
  atkStat: { color: colors.textSecondary, fontSize: 9, fontWeight: 'bold' },
  atkSpecial: { color: colors.accent, fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  sendBtn: { marginTop: spacing.md },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const friends = use$(friendsStore$.friends);
  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  const attacks = getUnlockedAttacks(unlockedCategories);

  useEffect(() => {
    fetchFriends();
    fetchUnlockedCategories();
  }, []);

  const handleChallenge = async () => {
    if (!selectedFriendId || !selectedAttackId) {
      Alert.alert('Sélection incomplète', 'Choisis un ami et une attaque d\'ouverture.');
      return;
    }

    const friend = (friends as any[]).find(
      (f: any) => (f.id ?? f.friend_id) === selectedFriendId,
    );
    const friendName = friend?.username ?? friend?.friend_profile?.username ?? 'Rival';
    const friendLevel = friend?.level ?? friend?.friend_profile?.level ?? 5;

    // Navigate to battle screen immediately with the selected attack pre-loaded
    router.push({
      pathname: '/duels/battle',
      params: {
        opponentName: friendName,
        opponentLevel: String(friendLevel),
        openingAttackId: selectedAttackId,
      },
    });

    // Also persist the challenge to Supabase in background
    setIsSending(true);
    try {
      await createDuel(selectedFriendId, selectedAttackId);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('limit')) {
        Alert.alert('Limite hebdomadaire', 'Tu as utilisé tes 2 duels cette semaine. Reviens lundi !');
      }
      // other errors silently ignored — battle is local demo
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />
      <Text style={styles.title}>CHALLENGE</Text>

      <Text style={styles.stepLabel}>1. CHOOSE YOUR OPPONENT</Text>
      {friends.length === 0 ? (
        <Text style={styles.hint}>No friends yet — add friends in the Social tab first.</Text>
      ) : (
        <FlatList
          data={friends}
          horizontal
          keyExtractor={(f) => f.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.sm }}
          renderItem={({ item: f }) => {
            const fid = f.profile?.id ?? f.id;
            const isSelected = selectedFriendId === fid;
            return (
              <Pressable
                style={[styles.friendChip, isSelected && styles.friendChipSelected]}
                onPress={() => setSelectedFriendId(fid)}
              >
                <Text style={styles.friendEmoji}>🧙</Text>
                <Text style={[styles.friendName, isSelected && styles.friendNameSelected]}>
                  {f.profile?.username ?? 'Hero'}
                </Text>
                <Text style={styles.friendLevel}>Lv.{f.profile?.level ?? 1}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Text style={styles.stepLabel}>2. CHOOSE YOUR OPENING ATTACK</Text>
      <FlatList
        data={attacks}
        keyExtractor={(a) => a.id}
        numColumns={2}
        columnWrapperStyle={{ gap: spacing.sm }}
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.lg }}
        renderItem={({ item: a }) => {
          const isSelected = selectedAttackId === a.id;
          return (
            <Pressable
              style={[styles.attackCard, isSelected && styles.attackCardSelected]}
              onPress={() => setSelectedAttackId(a.id)}
            >
              <Text style={styles.atkEmoji}>{a.emoji}</Text>
              <Text style={styles.atkName}>{a.name}</Text>
              <Text style={styles.atkDesc}>{a.description}</Text>
              <View style={styles.atkStats}>
                <Text style={styles.atkStat}>DMG {a.baseDamage}</Text>
                <Text style={styles.atkStat}>HIT {Math.round(a.hitChance * 100)}%</Text>
              </View>
              {a.special && <Text style={styles.atkSpecial}>{a.special.toUpperCase()}</Text>}
            </Pressable>
          );
        }}
      />

      <PixelButton
        title={isSending ? 'Sending...' : 'SEND CHALLENGE'}
        onPress={handleChallenge}
        style={styles.sendBtn}
      />
    </View>
  );
}



import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { use$ } from '@legendapp/state/react';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../../src/ui/theme/tokens';
import { friendsStore$, fetchFriends } from '../../src/features/social/stores/friends-store';
import { duelStore$, fetchUnlockedCategories, createDuel } from '../../src/features/duels/stores/duel-store';
import { profileStore$ } from '../../src/features/gamification/stores/profile-store';
import { getUnlockedAttacks } from '../../src/features/duels/utils/attacks';
import { useTheme } from '../../src/ui/theme/theme-context';
import { useT } from '../../src/lib/i18n';
import { attackName, attackDescription } from '../../src/lib/i18n/labels';

export default function ChallengeScreen() {
  const T = useT();
  const { themeKey } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  title: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.text,
    letterSpacing: 2,
    marginBottom: spacing.md,
  },
  stepLabel: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
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
    borderRadius: 0,
    padding: spacing.sm,
    alignItems: 'center',
    alignSelf: 'flex-start',
    minWidth: 80,
    gap: 2,
  },
  friendChipSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '22' },
  friendEmoji: { fontSize: 28 },
  friendName: { color: colors.text, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold },
  friendNameSelected: { color: colors.primary },
  friendLevel: { color: colors.textMuted, fontSize: 9 },
  attackCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 0,
    borderBottomWidth: 4,
    padding: spacing.sm,
    alignItems: 'center',
    gap: 3,
  },
  attackCardSelected: { borderColor: colors.accent, backgroundColor: colors.accent + '18' },
  atkEmoji: { fontSize: 32 },
  atkName: { color: colors.text, fontSize: pixelSize(fontSizes.xs), fontFamily: fonts.bold, textAlign: 'center' },
  atkDesc: { color: colors.textMuted, fontSize: 9, textAlign: 'center', lineHeight: 12 },
  atkStats: { flexDirection: 'row', gap: spacing.sm },
  atkStat: { color: colors.textSecondary, fontSize: pixelSize(9), fontFamily: fonts.bold },
  atkSpecial: { color: colors.accent, fontSize: pixelSize(9), fontFamily: fonts.bold, letterSpacing: 0.5 },
  sendBtn: { marginTop: spacing.md },
}), [themeKey]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const friends = use$(friendsStore$.friends);
  const unlockedCategories = use$(duelStore$.myUnlockedCategories);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [selectedAttackId, setSelectedAttackId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const profile = use$(profileStore$.profile);

  const attacks = getUnlockedAttacks(unlockedCategories);

  useEffect(() => {
    fetchFriends();
    fetchUnlockedCategories();
  }, []);

  const handleChallenge = async () => {
    if (!selectedFriendId || !selectedAttackId) {
      Alert.alert(T.duels_challenge_incomplete_title, T.duels_challenge_incomplete_msg);
      return;
    }

    const friend = friends.find((f) => (f.profile?.id ?? f.id) === selectedFriendId)?.profile;
    const friendName = friend?.username ?? T.duels_battle_default_rival;
    const friendLevel = friend?.level ?? 1;

    // The duel is recorded first (the server checks the friendship and the
    // daily anti-spam cap), and the battle screen needs its id for the result.
    setIsSending(true);
    let duelId: string;
    try {
      duelId = await createDuel(selectedFriendId, selectedAttackId);
    } catch (err) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      if (message.includes('too many duels')) {
        Alert.alert(T.duels_challenge_limit_title, T.duels_challenge_limit_msg);
      } else {
        Alert.alert(T.duels_challenge_error_title, T.duels_challenge_error_msg);
      }
      return;
    } finally {
      setIsSending(false);
    }

    router.push({
      pathname: '/duels/battle',
      params: {
        duelId,
        opponentId: selectedFriendId,
        opponentName: friendName,
        opponentLevel: String(friendLevel),
        myName: profile?.username ?? '',
        myLevel: String(profile?.level ?? 1),
        openingAttackId: selectedAttackId,
      },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PixelButton title={T.common_back} onPress={() => router.back()} variant="ghost" />
      <Text style={styles.title}>{T.duels_challenge_title}</Text>

      <Text style={styles.stepLabel}>{T.duels_challenge_step1}</Text>
      {friends.length === 0 ? (
        <Text style={styles.hint}>{T.duels_challenge_no_friends}</Text>
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
                  {f.profile?.username ?? T.duels_challenge_default_hero}
                </Text>
                <Text style={styles.friendLevel}>Lv.{f.profile?.level ?? 1}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Text style={styles.stepLabel}>{T.duels_challenge_step2}</Text>
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
              <Text style={styles.atkName}>{attackName(T, a)}</Text>
              <Text style={styles.atkDesc}>{attackDescription(T, a)}</Text>
              <View style={styles.atkStats}>
                <Text style={styles.atkStat}>{T.duels_challenge_dmg.replace('{n}', String(a.baseDamage))}</Text>
                <Text style={styles.atkStat}>{T.duels_challenge_hit.replace('{n}', String(Math.round(a.hitChance * 100)))}</Text>
              </View>
              {a.special && <Text style={styles.atkSpecial}>{a.special.toUpperCase()}</Text>}
            </Pressable>
          );
        }}
      />

      <PixelButton
        title={isSending ? T.duels_challenge_sending : T.duels_challenge_send}
        onPress={handleChallenge}
        style={styles.sendBtn}
      />
    </View>
  );
}



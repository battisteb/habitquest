import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useAuth } from '../../src/features/auth/hooks/use-auth';
import { signOut } from '../../src/features/auth/stores/auth-store';
import { useProfileStats } from '../../src/features/gamification/hooks/use-profile-stats';
import { XpBar } from '../../src/features/gamification/components/xp-bar';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, xpForNextLevel, xpProgress, isLoading } = useProfileStats();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.title}>PROFILE</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.username}>{profile?.username ?? 'Adventurer'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <View style={styles.card}>
            <XpBar
              level={profile?.level ?? 0}
              currentXp={profile?.xp ?? 0}
              nextLevelXp={xpForNextLevel}
              progress={xpProgress}
            />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{profile?.xp ?? 0}</Text>
              <Text style={styles.miniStatLabel}>TOTAL XP</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>{profile?.level ?? 0}</Text>
              <Text style={styles.miniStatLabel}>LEVEL</Text>
            </View>
            <View style={styles.miniStat}>
              <Text style={[styles.miniStatValue, { color: colors.accent }]}>
                {profile?.gold ?? 0}
              </Text>
              <Text style={styles.miniStatLabel}>GOLD</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.rankLabel}>RANK</Text>
            <Text style={styles.rankValue}>
              {profile?.rank ?? 'Novice'}
            </Text>
          </View>
        </>
      )}

      <View style={styles.actions}>
        <PixelButton
          title="Settings"
          onPress={() => router.push('/settings')}
          variant="secondary"
        />
        <PixelButton title="Sign out" onPress={signOut} variant="ghost" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  username: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  email: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  miniStat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  miniStatValue: {
    fontSize: fontSizes.xxl,
    fontWeight: 'bold',
    color: colors.accent,
  },
  miniStatLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  rankLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  rankValue: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.streak,
  },
  actions: {
    marginTop: 'auto',
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
});

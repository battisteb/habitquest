import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../src/ui/components/pixel-button';
import { useTheme } from '../src/ui/theme/theme-context';
import { THEME_META, ThemeKey } from '../src/ui/theme/themes';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  applyNotificationPrefs,
  NotificationPrefs,
} from '../src/features/notifications/utils/notification-service';
import { signOut } from '../src/features/auth/stores/auth-store';
import { colors, fontSizes, spacing } from '../src/ui/theme/tokens';
import { use$ } from '@legendapp/state/react';
import { subscriptionStore$ } from '../src/features/monetization/stores/subscription-store';

const THEME_KEYS: ThemeKey[] = ['default', 'medieval', 'cyberpunk', 'nature'];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeKey, setTheme } = useTheme();

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const isPremium = use$(subscriptionStore$.isPremium);

  function updatePref<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPrefs(next);
    applyNotificationPrefs(next);
  }

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/sign-in');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <PixelButton title="< Back" onPress={() => router.back()} variant="ghost" />

      <View style={styles.header}>
        <Text style={styles.screenLabel}>PROFILE</Text>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Theme section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>THEME</Text>
        <View style={styles.themeGrid}>
          {THEME_KEYS.map((key) => {
            const meta = THEME_META[key];
            const active = themeKey === key;
            return (
              <Pressable
                key={key}
                style={[styles.themeCard, active && styles.themeCardActive]}
                onPress={() => setTheme(key)}
              >
                <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                <Text style={[styles.themeName, active && styles.themeNameActive]} numberOfLines={1}>
                  {meta.name}
                </Text>
                <Text style={styles.themeDesc} numberOfLines={2}>
                  {meta.description}
                </Text>
                {active && <Text style={styles.activeChip}>ACTIVE</Text>}
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notifications section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>

        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <Text style={styles.prefLabel}>Daily reminder</Text>
            <Text style={styles.prefSub}>Get nudged to complete your habits</Text>
          </View>
          <Switch
            value={prefs.dailyReminderEnabled}
            onValueChange={(v) => updatePref('dailyReminderEnabled', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>

        {prefs.dailyReminderEnabled && (
          <View style={styles.timeRow}>
            <Text style={styles.prefSub}>Reminder time</Text>
            <View style={styles.timeButtons}>
              {[7, 8, 9, 10, 12, 18, 20, 21].map((h) => (
                <Pressable
                  key={h}
                  style={[styles.timeBtn, prefs.dailyReminderHour === h && styles.timeBtnActive]}
                  onPress={() => updatePref('dailyReminderHour', h)}
                >
                  <Text style={[styles.timeBtnText, prefs.dailyReminderHour === h && styles.timeBtnTextActive]}>
                    {h}:00
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <Text style={styles.prefLabel}>Streak at risk</Text>
            <Text style={styles.prefSub}>Alert at 20:00 if streak not completed</Text>
          </View>
          <Switch
            value={prefs.streakRiskEnabled}
            onValueChange={(v) => updatePref('streakRiskEnabled', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>

        <View style={styles.prefRow}>
          <View style={styles.prefInfo}>
            <Text style={styles.prefLabel}>Weekly recap</Text>
            <Text style={styles.prefSub}>Sunday summary of your week</Text>
          </View>
          <Switch
            value={prefs.weeklyRecapEnabled}
            onValueChange={(v) => updatePref('weeklyRecapEnabled', v)}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      </View>

      {/* Premium section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABONNEMENT</Text>
        {isPremium ? (
          <View style={styles.premiumBadgeRow}>
            <Text style={styles.premiumActive}>👑 PREMIUM ACTIF</Text>
            <Text style={styles.premiumSub}>Toutes les fonctionnalités sont débloquées</Text>
          </View>
        ) : (
          <PixelButton
            title="👑 Passer Premium — Supprimer les pubs"
            onPress={() => router.push('/paywall')}
            variant="secondary"
          />
        )}
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>

        <PixelButton
          title="Edit Profile"
          onPress={() => router.push('/profile/edit')}
          variant="secondary"
        />
        <PixelButton
          title="🎯 Focus Mode"
          onPress={() => router.push('/settings/contextual-mode')}
          variant="secondary"
        />
        <PixelButton
          title="📦 Archived Habits"
          onPress={() => router.push('/habit/archive')}
          variant="secondary"
        />

        <PixelButton
          title="Sign Out"
          onPress={handleSignOut}
          variant="ghost"
        />
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <Text style={styles.appInfoText}>HabitQuest v1.0.0</Text>
        <Text style={styles.appInfoText}>Built with ⚔️ and pixel art</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  screenLabel: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },

  // Theme grid
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  themeCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 3,
  },
  themeCardActive: {
    borderColor: colors.primary,
  },
  themeEmoji: {
    fontSize: 24,
  },
  themeName: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
  themeNameActive: {
    color: colors.primary,
  },
  themeDesc: {
    fontSize: fontSizes.xs - 1,
    color: colors.textMuted,
    lineHeight: 14,
  },
  activeChip: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: 1,
    marginTop: 2,
  },

  // Notification prefs
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  prefInfo: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    fontSize: fontSizes.sm,
    fontWeight: 'bold',
    color: colors.text,
  },
  prefSub: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  timeRow: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  timeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  timeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  timeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '33',
  },
  timeBtnText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  timeBtnTextActive: {
    color: colors.primary,
  },

  // Premium status
  premiumBadgeRow: {
    backgroundColor: '#FFD700' + '18',
    borderWidth: 2,
    borderColor: '#FFD700' + '66',
    borderRadius: 4,
    padding: spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  premiumActive: {
    fontSize: fontSizes.md,
    fontWeight: 'bold',
    color: '#FFD700',
    letterSpacing: 1,
  },
  premiumSub: {
    fontSize: fontSizes.xs,
    color: colors.textSecondary,
  },

  // App info
  appInfo: {
    alignItems: 'center',
    gap: 4,
    paddingTop: spacing.sm,
  },
  appInfoText: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
});

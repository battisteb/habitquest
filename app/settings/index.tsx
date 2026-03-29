import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PixelButton } from '../../src/ui/components/pixel-button';
import { useAuth } from '../../src/features/auth/hooks/use-auth';
import { signOut } from '../../src/features/auth/stores/auth-store';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  applyNotificationPrefs,
  type NotificationPrefs,
} from '../../src/features/notifications/utils/notification-service';
import { supabase } from '../../src/lib/supabase/client';
import { colors, fontSizes, spacing } from '../../src/ui/theme/tokens';

const HOUR_OPTIONS = [6, 7, 8, 9, 10, 12, 14, 18, 20];

export default function SettingsScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(getNotificationPrefs);

  useEffect(() => {
    saveNotificationPrefs(prefs);
    applyNotificationPrefs(prefs);
  }, [prefs]);

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Mark profile for deletion, then sign out
            // Full deletion handled by Supabase Edge Function
            if (user?.id) {
              await supabase.from('profiles').update({ username: '[deleted]' }).eq('id', user.id);
            }
            signOut();
          },
        },
      ],
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <PixelButton title="Back" onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>SETTINGS</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email ?? '—'}</Text>
          </View>
        </View>
      </View>

      {/* Notifications section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Daily reminder</Text>
            <Switch
              value={prefs.dailyReminderEnabled}
              onValueChange={(v) => setPrefs((p) => ({ ...p, dailyReminderEnabled: v }))}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          {prefs.dailyReminderEnabled && (
            <View style={styles.row}>
              <Text style={styles.label}>Reminder time</Text>
              <View style={styles.timeSelector}>
                {HOUR_OPTIONS.map((h) => (
                  <TimeChip
                    key={h}
                    hour={h}
                    selected={prefs.dailyReminderHour === h}
                    onPress={() => setPrefs((p) => ({ ...p, dailyReminderHour: h }))}
                  />
                ))}
              </View>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Streak-at-risk alert</Text>
            <Switch
              value={prefs.streakRiskEnabled}
              onValueChange={(v) => setPrefs((p) => ({ ...p, streakRiskEnabled: v }))}
              trackColor={{ false: colors.border, true: colors.streak }}
              thumbColor={colors.text}
            />
          </View>
          {prefs.streakRiskEnabled && (
            <Text style={styles.hint}>
              Notifies at 8 PM if you have uncompleted habits with active streaks.
            </Text>
          )}
        </View>
      </View>

      {/* Danger zone */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DANGER ZONE</Text>
        <View style={styles.card}>
          <PixelButton
            title="Sign out"
            onPress={signOut}
            variant="secondary"
          />
          <PixelButton
            title="Delete account"
            onPress={handleDeleteAccount}
            variant="ghost"
            style={{ borderColor: colors.danger }}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function TimeChip({
  hour,
  selected,
  onPress,
}: {
  hour: number;
  selected: boolean;
  onPress: () => void;
}) {
  const label = hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`;

  return (
    <View
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text
        style={[styles.chipText, selected && styles.chipTextSelected]}
        onPress={onPress}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.md,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: 'bold',
    color: colors.text,
    letterSpacing: 2,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  label: {
    fontSize: fontSizes.md,
    color: colors.text,
    fontWeight: 'bold',
  },
  value: {
    fontSize: fontSizes.sm,
    color: colors.textSecondary,
  },
  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: -spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  timeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    flex: 1,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: fontSizes.xs,
    fontWeight: 'bold',
    color: colors.textMuted,
  },
  chipTextSelected: {
    color: colors.text,
  },
});

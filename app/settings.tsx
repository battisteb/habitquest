import { useEffect, useMemo, useState } from 'react';
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
import { THEME_META, THEMES, ThemeKey } from '../src/ui/theme/themes';
import {
  getNotificationPrefs,
  saveNotificationPrefs,
  applyNotificationPrefs,
  NotificationPrefs,
} from '../src/features/notifications/utils/notification-service';
import { signOut, deleteAccount } from '../src/features/auth/stores/auth-store';
import { colors, fontSizes, spacing, fonts, pixelSize } from '../src/ui/theme/tokens';
import { use$ } from '@legendapp/state/react';
import { subscriptionStore$ } from '../src/features/monetization/stores/subscription-store';
import { useT, setLang, lang$ } from '../src/lib/i18n';
import { openLegalPage } from '../src/lib/legal-links';
import Constants from 'expo-constants';
import { resetTutorial } from '../src/features/onboarding/tutorial-state';
import { useOwnedThemes } from '../src/features/shop/hooks/use-owned-themes';
import { fetchShop, setActiveTheme } from '../src/features/shop/stores/shop-store';
import {
  isSfxEnabled,
  isMusicEnabled,
  setSfxEnabled,
  playSfx,
  setMusicEnabled,
} from '../src/lib/audio/sound-service';

const THEME_KEYS: ThemeKey[] = ['default', 'medieval', 'cyberpunk', 'nature', 'lifestyle'];

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { themeKey, setTheme } = useTheme();
  const ownedThemes = useOwnedThemes();
  useEffect(() => {
    void fetchShop();
  }, []);
  const pickTheme = (key: ThemeKey) => {
    if (ownedThemes.has(key)) {
      setTheme(key);
      void setActiveTheme(key).catch(() => {});
      return;
    }
    Alert.alert(T.settings_theme_locked_title, T.settings_theme_locked_msg, [
      { text: T.settings_sign_out_cancel, style: 'cancel' },
      { text: T.settings_theme_locked_cta, onPress: () => router.push('/shop') },
    ]);
  };
  const styles = useMemo(createStyles, [themeKey]);
  const T = useT();
  const currentLang = use$(lang$);

  const [prefs, setPrefs] = useState<NotificationPrefs>(() => getNotificationPrefs());
  const [sfxOn, setSfxOn] = useState<boolean>(() => isSfxEnabled());
  const [musicOn, setMusicOn] = useState<boolean>(() => isMusicEnabled());
  const isPremium = use$(subscriptionStore$.isPremium);

  function updatePref<K extends keyof NotificationPrefs>(key: K, value: NotificationPrefs[K]) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    saveNotificationPrefs(next);
    applyNotificationPrefs(next);
  }

  const handleSignOut = () => {
    Alert.alert(
      T.settings_sign_out_confirm_title,
      T.settings_sign_out_confirm_msg,
      [
        { text: T.settings_sign_out_cancel, style: 'cancel' },
        {
          text: T.settings_sign_out,
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/sign-in');
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      T.settings_delete_account_title,
      T.settings_delete_account_msg,
      [
        { text: T.settings_sign_out_cancel, style: 'cancel' },
        {
          text: T.settings_delete_account_confirm,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace('/(auth)/sign-in');
            } catch {
              Alert.alert(T.settings_delete_account_error);
            }
          },
        },
      ],
    );
  };

  // One row of a grouped card: label, optional subtitle, control on the right.
  const groupRow = (first: boolean) => [styles.groupRow, !first && styles.groupRowDivider];

  return (
    <ScrollView
      style={[styles.scroll, { paddingTop: insets.top }]}
      contentContainerStyle={styles.container}
    >
      <View style={styles.header}>
        <PixelButton title={T.settings_back} onPress={() => router.back()} variant="ghost" />
        <Text style={styles.title}>{T.settings_title}</Text>
      </View>

      {/* Theme section: one row of compact tiles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.settings_theme}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {THEME_KEYS.map((key) => {
            const meta = THEME_META[key];
            const active = themeKey === key;
            return (
              <Pressable
                key={key}
                style={[styles.themeCard, active && styles.themeCardActive]}
                onPress={() => pickTheme(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={styles.themeTop}>
                  <Text style={styles.themeEmoji}>{meta.emoji}</Text>
                  {/* Palette preview: background, primary, accent */}
                  <View style={styles.swatches}>
                    {[THEMES[key].background, THEMES[key].primary, THEMES[key].accent].map((c) => (
                      <View key={c} style={[styles.swatch, { backgroundColor: c }]} />
                    ))}
                  </View>
                </View>
                <Text style={[styles.themeName, active && styles.themeNameActive]} numberOfLines={2}>
                  {T[`theme_name_${key}` as keyof typeof T] ?? meta.name}
                </Text>
                {active ? (
                  <Text style={styles.activeChip}>{T.theme_active}</Text>
                ) : !ownedThemes.has(key) ? (
                  <Text style={styles.lockedChip}>🔒 {T.settings_theme_locked_chip}</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Language section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.settings_language}</Text>
        <View style={styles.langRow}>
          {(['fr', 'en'] as const).map((l) => (
            <Pressable
              key={l}
              style={[styles.langBtn, currentLang === l && styles.langBtnActive]}
              onPress={() => setLang(l)}
            >
              <Text style={[styles.langBtnText, currentLang === l && styles.langBtnTextActive]}>
                {l === 'fr' ? T.lang_fr : T.lang_en}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notifications section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.settings_notifications}</Text>
        <View style={styles.group}>
          <View style={groupRow(true)}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>{T.settings_daily_reminder}</Text>
              <Text style={styles.prefSub} numberOfLines={1}>{T.settings_daily_reminder_sub}</Text>
            </View>
            <Switch
              value={prefs.dailyReminderEnabled}
              onValueChange={(v) => updatePref('dailyReminderEnabled', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          {prefs.dailyReminderEnabled && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timeButtons}>
              {[7, 8, 9, 10, 12, 18, 20, 21].map((h) => (
                <Pressable
                  key={h}
                  style={[styles.timeBtn, prefs.dailyReminderHour === h && styles.timeBtnActive]}
                  onPress={() => updatePref('dailyReminderHour', h)}
                  accessibilityLabel={`${T.settings_reminder_time} ${h}:00`}
                >
                  <Text style={[styles.timeBtnText, prefs.dailyReminderHour === h && styles.timeBtnTextActive]}>
                    {h}:00
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={groupRow(false)}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>{T.settings_streak_risk}</Text>
              <Text style={styles.prefSub} numberOfLines={1}>{T.settings_streak_risk_sub}</Text>
            </View>
            <Switch
              value={prefs.streakRiskEnabled}
              onValueChange={(v) => updatePref('streakRiskEnabled', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>

          <View style={groupRow(false)}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>{T.settings_weekly_recap}</Text>
              <Text style={styles.prefSub} numberOfLines={1}>{T.settings_weekly_recap_sub}</Text>
            </View>
            <Switch
              value={prefs.weeklyRecapEnabled}
              onValueChange={(v) => updatePref('weeklyRecapEnabled', v)}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
        </View>
      </View>

      {/* Audio section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.settings_audio}</Text>
        <View style={styles.group}>
          <View style={groupRow(true)}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>{T.settings_sfx}</Text>
              <Text style={styles.prefSub} numberOfLines={1}>{T.settings_sfx_sub}</Text>
            </View>
            <Switch
              value={sfxOn}
              onValueChange={(v) => { setSfxOn(v); setSfxEnabled(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
          <View style={groupRow(false)}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefLabel}>{T.settings_music}</Text>
              <Text style={styles.prefSub} numberOfLines={1}>{T.settings_music_sub}</Text>
            </View>
            <Switch
              value={musicOn}
              onValueChange={(v) => { setMusicOn(v); setMusicEnabled(v); }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          </View>
        </View>
      </View>

      {/* Premium section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.settings_subscription}</Text>
        {isPremium ? (
          <View style={styles.premiumBadgeRow}>
            <Text style={styles.premiumActive}>{T.settings_premium_active}</Text>
            <Text style={styles.premiumSub}>{T.settings_premium_active_sub}</Text>
          </View>
        ) : (
          <PixelButton
            title={T.settings_go_premium}
            onPress={() => router.push('/paywall')}
            variant="secondary"
          />
        )}
      </View>

      {/* Account section: a compact menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{T.settings_account}</Text>
        <View style={styles.group}>
          {[
            { label: T.settings_edit_profile, onPress: () => router.push('/profile/edit') },
            { label: T.settings_focus_mode, onPress: () => router.push('/settings/contextual-mode') },
            { label: T.settings_support, onPress: () => router.push('/settings/support') },
            { label: T.settings_archived, onPress: () => router.push('/habit/archive') },
            {
              label: T.settings_replay_tutorial,
              onPress: () => {
                resetTutorial();
                router.replace('/(tabs)/today');
              },
            },
          ].map((item, i) => (
            <Pressable
              key={item.label}
              style={({ pressed }) => [...groupRow(i === 0), pressed && styles.menuPressed]}
              onPress={() => {
                void playSfx('tap', 0.3);
                item.onPress();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuChevron}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.dangerRow}>
          <PixelButton title={T.settings_sign_out} onPress={handleSignOut} variant="ghost" />
          <PixelButton title={T.settings_delete_account} onPress={handleDeleteAccount} variant="ghost" />
        </View>
      </View>

      {/* App info */}
      <View style={styles.appInfo}>
        <View style={styles.legalRow}>
          <Pressable onPress={() => openLegalPage('privacy', currentLang)} accessibilityRole="link">
            <Text style={styles.legalLink}>{T.legal_privacy}</Text>
          </Pressable>
          <Text style={styles.appInfoText}>·</Text>
          <Pressable onPress={() => openLegalPage('terms', currentLang)} accessibilityRole="link">
            <Text style={styles.legalLink}>{T.legal_terms}</Text>
          </Pressable>
          <Text style={styles.appInfoText}>·</Text>
          <Pressable onPress={() => openLegalPage('support', currentLang)} accessibilityRole="link">
            <Text style={styles.legalLink}>{T.legal_help}</Text>
          </Pressable>
        </View>
        <Text style={styles.appInfoText}>
          {T.settings_version.replace('{version}', Constants.expoConfig?.version ?? '1.0.0')}
        </Text>
        <Text style={styles.appInfoText}>{T.settings_tagline}</Text>
      </View>
    </ScrollView>
  );
}

// Rebuilt when the theme changes (the screen shows the theme picker).
function createStyles() {
  return StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: pixelSize(fontSizes.xl),
    fontFamily: fonts.bold,
    color: colors.text,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 2,
  },

  // Theme row
  themeRow: {
    gap: spacing.sm,
  },
  themeCard: {
    width: 128,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: 3,
  },
  themeCardActive: {
    borderColor: colors.primary,
  },
  themeEmoji: {
    fontSize: 20,
  },
  themeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  swatches: { flexDirection: 'row', gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  themeName: {
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: colors.text,
  },
  themeNameActive: {
    color: colors.primary,
  },
  activeChip: {
    fontSize: pixelSize(8),
    fontFamily: fonts.bold,
    color: colors.primary,
    letterSpacing: 1,
    marginTop: 2,
  },
  lockedChip: {
    fontSize: pixelSize(8),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },

  // Grouped cards (notifications, audio, account menu)
  group: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    minHeight: 48,
  },
  groupRowDivider: {
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  menuPressed: {
    backgroundColor: colors.primary + '1A',
  },
  menuLabel: {
    flex: 1,
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: colors.text,
  },
  menuChevron: {
    fontSize: pixelSize(fontSizes.lg),
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  prefInfo: {
    flex: 1,
    gap: 2,
  },
  prefLabel: {
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: colors.text,
  },
  prefSub: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
  },
  timeButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  timeBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  timeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '33',
  },
  timeBtnText: {
    fontSize: pixelSize(fontSizes.xs),
    fontFamily: fonts.bold,
    color: colors.textMuted,
  },
  timeBtnTextActive: {
    color: colors.primary,
  },

  // Language selector
  langRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  langBtn: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  langBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '22',
  },
  langBtnText: {
    fontSize: pixelSize(fontSizes.sm),
    fontFamily: fonts.bold,
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  langBtnTextActive: {
    color: colors.primary,
  },

  // Premium status
  premiumBadgeRow: {
    backgroundColor: '#FFD700' + '18',
    borderWidth: 2,
    borderColor: '#FFD700' + '66',
    borderRadius: 0,
    padding: spacing.md,
    gap: 4,
    alignItems: 'center',
  },
  premiumActive: {
    fontSize: pixelSize(fontSizes.md),
    fontFamily: fonts.bold,
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
  legalRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
  legalLink: { fontSize: fontSizes.xs, color: colors.textSecondary, textDecorationLine: 'underline' },
});
}

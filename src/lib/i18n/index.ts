import { observable } from '@legendapp/state';
import { use$ } from '@legendapp/state/react';
import { storage } from '../storage/mmkv';

export type Lang = 'fr' | 'en';

const STORAGE_KEY = 'app_language';

export const lang$ = observable<Lang>(
  (storage.getString(STORAGE_KEY) as Lang | undefined) ?? 'fr',
);

lang$.onChange(({ value }) => storage.set(STORAGE_KEY, value));

export function setLang(l: Lang): void {
  lang$.set(l);
}

// ─── Translations ─────────────────────────────────────────────────────────────

const FR = {
  // Tabs
  tab_quests: 'QUÊTES',
  tab_social: 'SOCIAL',
  tab_shop: 'BOUTIQUE',
  tab_me: 'MOI',
  // Settings
  settings_back: '< Retour',
  settings_screen_label: 'PROFIL',
  settings_title: 'Réglages',
  settings_theme: 'THÈME',
  settings_notifications: 'NOTIFICATIONS',
  settings_language: 'LANGUE',
  settings_subscription: 'ABONNEMENT',
  settings_account: 'COMPTE',
  settings_daily_reminder: 'Rappel quotidien',
  settings_daily_reminder_sub: 'Rappel pour compléter tes habitudes',
  settings_reminder_time: 'Heure du rappel',
  settings_streak_risk: 'Série en danger',
  settings_streak_risk_sub: 'Alerte à 20h si la série n\'est pas complétée',
  settings_weekly_recap: 'Récap hebdo',
  settings_weekly_recap_sub: 'Résumé de ta semaine le dimanche',
  settings_edit_profile: 'Modifier profil',
  settings_focus_mode: '🎯 Mode Focus',
  settings_archived: '📦 Habitudes archivées',
  settings_sign_out: 'Déconnexion',
  settings_sign_out_confirm_title: 'Déconnexion',
  settings_sign_out_confirm_msg: 'Es-tu sûr de vouloir te déconnecter ?',
  settings_sign_out_cancel: 'Annuler',
  settings_version: 'HabitQuest v1.0.0',
  settings_tagline: 'Fait avec ⚔️ et pixel art',
  // Language section
  lang_fr: '🇫🇷 Français',
  lang_en: '🇬🇧 English',
  theme_active: 'ACTIF',
} as const;

const EN = {
  // Tabs
  tab_quests: 'QUESTS',
  tab_social: 'SOCIAL',
  tab_shop: 'SHOP',
  tab_me: 'ME',
  // Settings
  settings_back: '< Back',
  settings_screen_label: 'PROFILE',
  settings_title: 'Settings',
  settings_theme: 'THEME',
  settings_notifications: 'NOTIFICATIONS',
  settings_language: 'LANGUAGE',
  settings_subscription: 'SUBSCRIPTION',
  settings_account: 'ACCOUNT',
  settings_daily_reminder: 'Daily reminder',
  settings_daily_reminder_sub: 'Get nudged to complete your habits',
  settings_reminder_time: 'Reminder time',
  settings_streak_risk: 'Streak at risk',
  settings_streak_risk_sub: 'Alert at 20:00 if streak not completed',
  settings_weekly_recap: 'Weekly recap',
  settings_weekly_recap_sub: 'Sunday summary of your week',
  settings_edit_profile: 'Edit Profile',
  settings_focus_mode: '🎯 Focus Mode',
  settings_archived: '📦 Archived Habits',
  settings_sign_out: 'Sign Out',
  settings_sign_out_confirm_title: 'Sign out',
  settings_sign_out_confirm_msg: 'Are you sure you want to sign out?',
  settings_sign_out_cancel: 'Cancel',
  settings_version: 'HabitQuest v1.0.0',
  settings_tagline: 'Built with ⚔️ and pixel art',
  // Language section
  lang_fr: '🇫🇷 Français',
  lang_en: '🇬🇧 English',
  theme_active: 'ACTIVE',
} as const;

type Strings = Record<keyof typeof FR, string>;

const STRINGS: Record<Lang, Strings> = { fr: FR, en: EN };

/** Reactive hook — re-renders when language changes */
export function useT(): Strings {
  const lang = use$(lang$);
  return STRINGS[lang];
}

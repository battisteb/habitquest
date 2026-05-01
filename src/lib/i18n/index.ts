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
  // Weekly recap
  recap_label: 'CETTE SEMAINE',
  recap_title: 'Récap hebdo',
  recap_back: '< Retour',
  recap_stat_done: 'FAIT',
  recap_stat_xp: 'XP',
  recap_stat_best: 'MEILLEUR',
  recap_stat_rate: 'TAUX',
  recap_chart_title: 'COMPLÉTIONS PAR JOUR',
  recap_compare_title: 'VS LA SEMAINE DERNIÈRE',
  recap_compare_better: '↑ {n} de plus',
  recap_compare_worse: '↓ {n} de moins',
  recap_compare_equal: '= identique',
  recap_compare_no_data: 'Première semaine — pas de comparaison',
  recap_top_title: '⭐ HABITUDE STAR',
  recap_top_done: '{n} fois cette semaine',
  recap_missed_title: '😴 LA PLUS OUBLIÉE',
  recap_missed_done: 'seulement {n} fois',
  recap_no_habits: 'Aucune habitude active.',
  recap_motivation_excellent: '🏆 Semaine excellente ! Tu es en feu !',
  recap_motivation_great: '💪 Belle progression ! Garde le rythme.',
  recap_motivation_solid: '⚔️ Bon effort. Pousse plus fort la semaine prochaine !',
  recap_motivation_seed: '🌱 Chaque pas compte. Continue !',
  recap_motivation_sub_strong: 'tu déchires 🔥',
  recap_motivation_sub_consistent: 'reste consistant 🎯',
  recap_active_habits: 'Tu as {n} habitude{s} active{s} —',
  // Day labels (short, 3 chars)
  day_mon: 'Lun',
  day_tue: 'Mar',
  day_wed: 'Mer',
  day_thu: 'Jeu',
  day_fri: 'Ven',
  day_sat: 'Sam',
  day_sun: 'Dim',
  // Stats screen
  stats_title: 'STATS',
  stats_total_done: 'TOTAL FAIT',
  stats_week_rate: 'TAUX SEMAINE',
  stats_active_streaks: 'SÉRIES ACTIVES',
  stats_best_streak: 'MEILLEURE SÉRIE',
  stats_section_training: 'ENTRAÎNEMENT',
  stats_sessions: 'SESSIONS',
  stats_workouts: 'EXERCICES',
  stats_decks: 'PAQUETS',
  stats_cards_reviewed: 'CARTES REVUES',
  stats_due_today: 'À FAIRE',
  stats_btn_recap: '📊 Récap hebdo',
  stats_btn_achievements: '🏅 Voir les succès',
  stats_premium_locked: 'Historique complet en Premium',
  // Achievements screen
  ach_title: 'SUCCÈS',
  ach_back: '< Retour',
  ach_progress: '% complété',
  ach_empty: 'Aucun succès dans cette catégorie.',
  ach_cat_all: 'TOUS',
  ach_cat_streak: 'SÉRIES',
  ach_cat_completion: 'FAITS',
  ach_cat_xp: 'XP',
  ach_cat_social: 'SOCIAL',
  ach_cat_shop: 'BOUTIQUE',
  ach_cat_special: 'SPÉCIAUX',
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
  // Weekly recap
  recap_label: 'THIS WEEK',
  recap_title: 'Weekly Recap',
  recap_back: '< Back',
  recap_stat_done: 'DONE',
  recap_stat_xp: 'XP',
  recap_stat_best: 'BEST',
  recap_stat_rate: 'RATE',
  recap_chart_title: 'COMPLETIONS BY DAY',
  recap_compare_title: 'VS LAST WEEK',
  recap_compare_better: '↑ {n} more',
  recap_compare_worse: '↓ {n} fewer',
  recap_compare_equal: '= same',
  recap_compare_no_data: 'First week — no comparison yet',
  recap_top_title: '⭐ STAR HABIT',
  recap_top_done: '{n} times this week',
  recap_missed_title: '😴 MOST MISSED',
  recap_missed_done: 'only {n} times',
  recap_no_habits: 'No active habits.',
  recap_motivation_excellent: "🏆 Outstanding week! You're on fire!",
  recap_motivation_great: '💪 Great progress! Keep the momentum going.',
  recap_motivation_solid: '⚔️ Solid effort. Push harder next week!',
  recap_motivation_seed: '🌱 Every journey starts with a single step.',
  recap_motivation_sub_strong: "you're crushing it 🔥",
  recap_motivation_sub_consistent: 'stay consistent 🎯',
  recap_active_habits: 'You have {n} active habit{s} —',
  // Day labels (short, 3 chars)
  day_mon: 'Mon',
  day_tue: 'Tue',
  day_wed: 'Wed',
  day_thu: 'Thu',
  day_fri: 'Fri',
  day_sat: 'Sat',
  day_sun: 'Sun',
  // Stats screen
  stats_title: 'STATS',
  stats_total_done: 'TOTAL DONE',
  stats_week_rate: 'WEEK RATE',
  stats_active_streaks: 'ACTIVE STREAKS',
  stats_best_streak: 'BEST STREAK',
  stats_section_training: 'TRAINING',
  stats_sessions: 'SESSIONS',
  stats_workouts: 'WORKOUTS',
  stats_decks: 'DECKS',
  stats_cards_reviewed: 'CARDS REVIEWED',
  stats_due_today: 'DUE TODAY',
  stats_btn_recap: '📊 Weekly Recap',
  stats_btn_achievements: '🏅 View Achievements',
  stats_premium_locked: 'Full history in Premium',
  // Achievements screen
  ach_title: 'ACHIEVEMENTS',
  ach_back: '< Back',
  ach_progress: '% complete',
  ach_empty: 'No achievements in this category.',
  ach_cat_all: 'ALL',
  ach_cat_streak: 'STREAK',
  ach_cat_completion: 'DONE',
  ach_cat_xp: 'XP',
  ach_cat_social: 'SOCIAL',
  ach_cat_shop: 'SHOP',
  ach_cat_special: 'SPECIAL',
} as const;

type Strings = Record<keyof typeof FR, string>;

const STRINGS: Record<Lang, Strings> = { fr: FR, en: EN };

/** Reactive hook — re-renders when language changes */
export function useT(): Strings {
  const lang = use$(lang$);
  return STRINGS[lang];
}

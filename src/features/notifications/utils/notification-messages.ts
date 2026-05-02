import { lang$ } from '../../../lib/i18n';

export type NotificationContext =
  | 'reminder'
  | 'streak_at_risk'
  | 'streak_milestone'
  | 'level_up'
  | 'all_done';

const MESSAGES_EN: Record<NotificationContext, string[]> = {
  reminder: [
    '⚔️ Your quests await, hero!',
    '🎯 Time to level up your habits!',
    '🔥 Don\'t break the chain today!',
    '⚡ Your streak is counting on you!',
    '🏆 Champions show up every day.',
    '💪 One habit at a time. You\'ve got this.',
  ],
  streak_at_risk: [
    '⚠️ Streak in danger! Complete today to survive.',
    '🔥 Your flame is flickering — don\'t let it die!',
    '❄️ Streak freeze available if you need a break.',
    '⚡ Last chance to keep your streak alive!',
  ],
  streak_milestone: [
    '🏆 Milestone reached! You\'re on fire!',
    '🎉 Incredible streak! Keep pushing!',
    '💎 Legendary consistency unlocked!',
  ],
  level_up: [
    '🚀 LEVEL UP! You\'re getting stronger!',
    '⭐ New level reached — new powers await!',
    '🏅 You levelled up! Keep grinding!',
  ],
  all_done: [
    '✅ ALL DONE! Perfect day, hero!',
    '🏆 Quest complete! See you tomorrow.',
    '💎 Flawless day! You\'re unstoppable.',
  ],
};

const MESSAGES_FR: Record<NotificationContext, string[]> = {
  reminder: [
    '⚔️ Tes quêtes t\'attendent, héros !',
    '🎯 C\'est l\'heure de progresser !',
    '🔥 Ne brise pas la chaîne aujourd\'hui !',
    '⚡ Ta série compte sur toi !',
    '🏆 Les champions se montrent chaque jour.',
    '💪 Une habitude à la fois. Tu y arrives.',
  ],
  streak_at_risk: [
    '⚠️ Série en danger ! Complète aujourd\'hui pour survivre.',
    '🔥 Ta flamme vacille — ne la laisse pas mourir !',
    '❄️ Protection de série disponible si tu as besoin d\'une pause.',
    '⚡ Dernière chance de garder ta série vivante !',
  ],
  streak_milestone: [
    '🏆 Jalon atteint ! Tu es en feu !',
    '🎉 Série incroyable ! Continue à pousser !',
    '💎 Régularité légendaire débloquée !',
  ],
  level_up: [
    '🚀 NIVEAU SUPÉRIEUR ! Tu deviens plus fort !',
    '⭐ Nouveau niveau atteint — de nouveaux pouvoirs t\'attendent !',
    '🏅 Tu as monté de niveau ! Continue à t\'entraîner !',
  ],
  all_done: [
    '✅ TOUT FAIT ! Journée parfaite, héros !',
    '🏆 Quête accomplie ! À demain.',
    '💎 Journée sans faute ! Tu es inarrêtable.',
  ],
};

export function getRandomMessage(context: NotificationContext): string {
  const msgs = lang$.get() === 'fr' ? MESSAGES_FR[context] : MESSAGES_EN[context];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

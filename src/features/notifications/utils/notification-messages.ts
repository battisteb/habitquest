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

const MESSAGES_JA: Record<NotificationContext, string[]> = {
  reminder: [
    '⚔️ クエストが待ってるよ、ヒーロー！',
    '🎯 習慣をレベルアップする時間だ！',
    '🔥 今日も連続記録をつなごう！',
    '⚡ 連続記録がきみを待ってる！',
    '🏆 チャンピオンは毎日あらわれる。',
    '💪 一歩ずつ。きみならできる。',
  ],
  streak_at_risk: [
    '⚠️ 連続記録がピンチ！今日達成して守ろう。',
    '🔥 炎が消えそう — 守り抜こう！',
    '❄️ ひと休みしたいなら連続記録フリーズが使えるよ。',
    '⚡ 連続記録を守るラストチャンス！',
  ],
  streak_milestone: [
    '🏆 節目に到達！絶好調だね！',
    '🎉 すごい連続記録！この調子で！',
    '💎 伝説級の継続力を解除！',
  ],
  level_up: [
    '🚀 レベルアップ！どんどん強くなってる！',
    '⭐ 新しいレベルへ — 新しい力が待ってる！',
    '🏅 レベルが上がった！鍛錬を続けよう！',
  ],
  all_done: [
    '✅ 全部達成！パーフェクトな1日だ、ヒーロー！',
    '🏆 クエスト完了！また明日。',
    '💎 完璧な1日！もう誰にも止められない。',
  ],
};

export function getRandomMessage(context: NotificationContext): string {
  const lang = lang$.get();
  const msgs = (lang === 'fr' ? MESSAGES_FR : lang === 'ja' ? MESSAGES_JA : MESSAGES_EN)[context];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

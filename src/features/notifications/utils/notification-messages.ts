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

const MESSAGES_KO: Record<NotificationContext, string[]> = {
  reminder: [
    '⚔️ 퀘스트가 기다리고 있어요, 히어로!',
    '🎯 습관을 레벨 업할 시간이에요!',
    '🔥 오늘도 연속 기록을 이어가요!',
    '⚡ 연속 기록이 기다리고 있어요!',
    '🏆 챔피언은 매일 나타나요.',
    '💪 한 걸음씩. 할 수 있어요.',
  ],
  streak_at_risk: [
    '⚠️ 연속 기록이 위험해요! 오늘 달성해서 지켜요.',
    '🔥 불꽃이 꺼지려고 해요 — 지켜 내요!',
    '❄️ 쉬고 싶다면 연속 기록 프리즈를 쓸 수 있어요.',
    '⚡ 연속 기록을 지킬 마지막 기회!',
  ],
  streak_milestone: [
    '🏆 새로운 이정표 달성! 최고예요!',
    '🎉 대단한 연속 기록! 이대로 가요!',
    '💎 전설급 꾸준함 해금!',
  ],
  level_up: [
    '🚀 레벨 업! 점점 강해지고 있어요!',
    '⭐ 새로운 레벨 — 새로운 힘이 기다려요!',
    '🏅 레벨이 올랐어요! 계속 단련해요!',
  ],
  all_done: [
    '✅ 전부 달성! 완벽한 하루예요, 히어로!',
    '🏆 퀘스트 완료! 내일 또 만나요.',
    '💎 완벽한 하루! 이제 아무도 못 막아요.',
  ],
};

export function getRandomMessage(context: NotificationContext): string {
  const lang = lang$.get();
  const msgs = (lang === 'fr' ? MESSAGES_FR : lang === 'ja' ? MESSAGES_JA : lang === 'ko' ? MESSAGES_KO : MESSAGES_EN)[context];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

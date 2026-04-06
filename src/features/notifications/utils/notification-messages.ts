export type NotificationContext =
  | 'reminder'
  | 'streak_at_risk'
  | 'streak_milestone'
  | 'level_up'
  | 'all_done';

const MESSAGES: Record<NotificationContext, string[]> = {
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

export function getRandomMessage(context: NotificationContext): string {
  const msgs = MESSAGES[context];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

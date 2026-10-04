import type { HabitCategory } from './categories';

export interface HabitTemplate {
  id: string;
  name_fr: string;
  name_en: string;
  name_ja: string;
  category: HabitCategory;
  emoji: string;
  frequency: 'daily' | '3x_week' | '5x_week';
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // Health
  { id: 'sleep',        name_fr: 'Dormir 8h',               name_en: 'Sleep 8 hours', name_ja: '8時間寝る',           category: 'sleep',        emoji: '😴', frequency: 'daily' },
  { id: 'vitamins',     name_fr: 'Prendre mes vitamines',   name_en: 'Take vitamins', name_ja: 'ビタミンを飲む',           category: 'health',       emoji: '💊', frequency: 'daily' },
  { id: 'no_alcohol',   name_fr: 'Pas d\'alcool',           name_en: 'No alcohol', name_ja: 'お酒を飲まない',              category: 'health',       emoji: '🚫', frequency: 'daily' },
  { id: 'no_sugar',     name_fr: 'Pas de sucre ajouté',     name_en: 'No added sugar', name_ja: '砂糖をひかえる',         category: 'nutrition',    emoji: '🍬', frequency: 'daily' },
  { id: 'veggies',      name_fr: '5 portions de légumes',   name_en: '5 veggie servings', name_ja: '野菜を5皿食べる',      category: 'nutrition',    emoji: '🥦', frequency: 'daily' },

  // Fitness
  { id: 'run',          name_fr: 'Courir 30 min',           name_en: 'Run 30 min', name_ja: '30分ランニング',             category: 'fitness',      emoji: '🏃', frequency: 'daily' },
  { id: 'pushups',      name_fr: '20 pompes',               name_en: '20 push-ups', name_ja: '腕立て20回',            category: 'fitness',      emoji: '💪', frequency: 'daily' },
  { id: 'gym',          name_fr: 'Aller à la salle',        name_en: 'Go to the gym', name_ja: 'ジムに行く',          category: 'fitness',      emoji: '🏋️', frequency: '3x_week' },
  { id: 'walk',         name_fr: 'Marcher 10 000 pas',      name_en: 'Walk 10 000 steps', name_ja: '1万歩あるく',      category: 'fitness',      emoji: '🚶', frequency: 'daily' },
  { id: 'stretch',      name_fr: 'Étirements 10 min',       name_en: 'Stretch 10 min', name_ja: '10分ストレッチ',         category: 'fitness',      emoji: '🤸', frequency: 'daily' },
  { id: 'yoga',         name_fr: 'Yoga 20 min',             name_en: 'Yoga 20 min', name_ja: '20分ヨガ',            category: 'mindfulness',  emoji: '🧘', frequency: '3x_week' },
  { id: 'cycling',      name_fr: 'Vélo 30 min',             name_en: 'Cycling 30 min', name_ja: '30分サイクリング',         category: 'fitness',      emoji: '🚴', frequency: '3x_week' },

  // Mindfulness
  { id: 'meditate',     name_fr: 'Méditer 10 min',          name_en: 'Meditate 10 min', name_ja: '10分瞑想',        category: 'mindfulness',  emoji: '🧘', frequency: 'daily' },
  { id: 'journal',      name_fr: 'Écrire dans mon journal', name_en: 'Write in journal', name_ja: '日記を書く',       category: 'mindfulness',  emoji: '📓', frequency: 'daily' },
  { id: 'gratitude',    name_fr: '3 gratitudes',            name_en: '3 gratitudes', name_ja: '感謝を3つ書く',           category: 'mindfulness',  emoji: '🙏', frequency: 'daily' },
  { id: 'breathe',      name_fr: 'Respiration profonde',    name_en: 'Deep breathing', name_ja: '深呼吸する',         category: 'mindfulness',  emoji: '🌬️', frequency: 'daily' },
  { id: 'no_phone_am',  name_fr: 'Pas d\'écran au réveil',  name_en: 'No phone in the morning', name_ja: '朝はスマホを見ない',category: 'mindfulness',  emoji: '📵', frequency: 'daily' },

  // Learning
  { id: 'read',         name_fr: 'Lire 20 min',             name_en: 'Read 20 min', name_ja: '20分読書',            category: 'learning',     emoji: '📚', frequency: 'daily' },
  { id: 'language',     name_fr: 'Apprendre une langue',    name_en: 'Language practice', name_ja: '語学の勉強',      category: 'learning',     emoji: '🗣️', frequency: 'daily' },
  { id: 'podcast',      name_fr: 'Écouter un podcast éducatif', name_en: 'Educational podcast', name_ja: '学べるポッドキャストを聴く',category: 'learning',     emoji: '🎧', frequency: 'daily' },
  { id: 'course',       name_fr: 'Avancer sur ma formation',name_en: 'Online course progress', name_ja: 'オンライン講座を進める', category: 'learning',     emoji: '🎓', frequency: '5x_week' },
  { id: 'flashcards',   name_fr: 'Réviser mes cartes',      name_en: 'Review flashcards', name_ja: '単語カードを復習',      category: 'learning',     emoji: '🃏', frequency: 'daily' },

  // Productivity
  { id: 'planning',     name_fr: 'Planifier ma journée',    name_en: 'Plan my day', name_ja: '1日の計画を立てる',            category: 'productivity', emoji: '📅', frequency: 'daily' },
  { id: 'review',       name_fr: 'Revue de fin de journée', name_en: 'Evening review', name_ja: '夜のふりかえり',         category: 'productivity', emoji: '✅', frequency: 'daily' },
  { id: 'inbox_zero',   name_fr: 'Vider ma boîte mail',     name_en: 'Clear inbox', name_ja: 'メールを片づける',            category: 'productivity', emoji: '📧', frequency: 'daily' },
  { id: 'deep_work',    name_fr: '2h de travail concentré', name_en: '2h of deep work', name_ja: '2時間集中して作業',        category: 'productivity', emoji: '🎯', frequency: 'daily' },
  { id: 'no_social',    name_fr: 'Pas de réseaux sociaux',  name_en: 'No social media', name_ja: 'SNSを見ない',       category: 'productivity', emoji: '🔕', frequency: 'daily' },

  // Social
  { id: 'call_family',  name_fr: 'Appeler un proche',       name_en: 'Call a loved one', name_ja: '大切な人に電話する',       category: 'social',       emoji: '📞', frequency: '3x_week' },
  { id: 'compliment',   name_fr: 'Faire un compliment',     name_en: 'Give a compliment', name_ja: '誰かをほめる',      category: 'social',       emoji: '😊', frequency: 'daily' },

  // Finance
  { id: 'budget',       name_fr: 'Suivre mes dépenses',     name_en: 'Track expenses', name_ja: '支出を記録する',         category: 'finance',      emoji: '💰', frequency: 'daily' },
  { id: 'no_impulse',   name_fr: 'Pas d\'achat impulsif',   name_en: 'No impulse buying', name_ja: '衝動買いをしない',      category: 'finance',      emoji: '🛍️', frequency: 'daily' },
  { id: 'save',         name_fr: 'Épargner aujourd\'hui',   name_en: 'Save money today', name_ja: '今日も貯金する',       category: 'finance',      emoji: '🏦', frequency: 'daily' },

  // Creativity
  { id: 'draw',         name_fr: 'Dessiner 15 min',         name_en: 'Draw 15 min', name_ja: '15分お絵かき',            category: 'creativity',   emoji: '🎨', frequency: 'daily' },
  { id: 'music',        name_fr: 'Jouer de la musique',     name_en: 'Practice instrument', name_ja: '楽器の練習',    category: 'creativity',   emoji: '🎵', frequency: 'daily' },
  { id: 'write',        name_fr: 'Écrire 500 mots',         name_en: 'Write 500 words', name_ja: '500字書く',        category: 'creativity',   emoji: '✍️', frequency: 'daily' },
];

export function getTemplatesByCategory(category: string): HabitTemplate[] {
  return HABIT_TEMPLATES.filter((t) => t.category === category);
}

/** The template's name in the player's language. */
export function templateName(t: HabitTemplate, lang: string): string {
  return lang === 'fr' ? t.name_fr : lang === 'ja' ? t.name_ja : t.name_en;
}

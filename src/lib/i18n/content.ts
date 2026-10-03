import type { Lang } from './index';

/**
 * French and Japanese versions of the game content seeded in English in the database
 * (daily quest templates, achievements, shop items). Keys are stable
 * identifiers: quest title, achievement `key`, shop item name.
 * A missing entry falls back to the database text.
 */
type Text = { title: string; description: string };

const QUESTS_FR: Record<string, Text> = {
  'Easy Does It': { title: 'Tout en douceur', description: "Valide 1 habitude, c'est tout" },
  'First Step': { title: 'Premier pas', description: "Valide 1 habitude aujourd'hui" },
  'Morning Starter': { title: 'Bien démarrer', description: "Valide n'importe quelle habitude pour lancer ta journée" },
  'Quick Win': { title: 'Victoire rapide', description: "Termine au moins 1 habitude aujourd'hui" },
  'All In': { title: 'À fond', description: 'Valide 4 habitudes dans la même journée' },
  'Habit Master': { title: 'Maître des habitudes', description: "Valide 5 habitudes aujourd'hui" },
  'Streak Guardian': { title: 'Gardien des séries', description: 'Garde la série de toutes tes habitudes' },
  'XP Grinder': { title: "Farmeur d'XP", description: "Gagne au moins 100 XP aujourd'hui" },
  'Double Down': { title: 'Doublé', description: 'Termine 2 habitudes pour prouver ta motivation' },
  'Fitness Focus': { title: 'Objectif sport', description: 'Valide une habitude sport' },
  'Healthy Mind': { title: 'Esprit sain', description: 'Valide une habitude santé' },
  'Knowledge Seeker': { title: 'Soif de savoir', description: "Valide une habitude d'apprentissage" },
  'Steady Progress': { title: 'Progrès régulier', description: "Valide 2 habitudes aujourd'hui" },
  'Triple Threat': { title: 'Triplé', description: "Valide 3 habitudes aujourd'hui" },
  'XP Hunter': { title: "Chasseur d'XP", description: "Gagne au moins 30 XP aujourd'hui" },
  'Inner Peace': { title: 'Paix intérieure', description: 'Valide une habitude bien-être' },
  'Getting Things Done': { title: 'Efficace', description: 'Valide une habitude productivité' },
  'Eat Well': { title: 'Bien manger', description: 'Valide une habitude nutrition' },
  'Well Rested': { title: 'Bien reposé', description: 'Valide une habitude sommeil' },
  'Creative Spark': { title: 'Étincelle créative', description: 'Valide une habitude créativité' },
  'Good Company': { title: 'Bien entouré', description: 'Valide une habitude sociale' },
};

const ACHIEVEMENTS_FR: Record<string, Text> = {
  buy_1: { title: 'Client', description: 'Achète ton premier objet' },
  buy_5: { title: 'Collectionneur', description: 'Possède 5 objets' },
  challenge_1: { title: 'Challenger', description: 'Termine ton premier défi' },
  challenge_win_1: { title: 'Vainqueur', description: 'Gagne ton premier défi' },
  complete_1: { title: 'Premier pas', description: 'Valide ta première habitude' },
  complete_10: { title: 'Lancé', description: 'Valide 10 habitudes au total' },
  complete_100: { title: 'Machine à habitudes', description: 'Valide 100 habitudes au total' },
  complete_50: { title: 'Assidu', description: 'Valide 50 habitudes au total' },
  complete_500: { title: 'Inarrêtable', description: 'Valide 500 habitudes au total' },
  equip_full: { title: 'Tout équipé', description: 'Équipe un objet dans les 4 emplacements' },
  friend_1: { title: 'Papillon social', description: 'Ajoute ton premier ami' },
  friend_5: { title: 'Chef de groupe', description: 'Aie 5 amis' },
  level_10: { title: 'Voie du champion', description: 'Atteins le niveau 10' },
  level_5: { title: 'Apprenti en progrès', description: 'Atteins le niveau 5' },
  streak_100: { title: 'Centurion', description: 'Atteins une série de 100 jours' },
  streak_14: { title: 'Combattant de la quinzaine', description: 'Atteins une série de 14 jours' },
  streak_3: { title: 'Régulier', description: 'Atteins une série de 3 jours' },
  streak_30: { title: 'Maître du mois', description: 'Atteins une série de 30 jours' },
  streak_7: { title: 'Guerrier de la semaine', description: 'Atteins une série de 7 jours' },
  xp_100: { title: "Novice de l'XP", description: 'Gagne 100 XP au total' },
  xp_1000: { title: "Vétéran de l'XP", description: 'Gagne 1000 XP au total' },
  xp_500: { title: "Chasseur d'XP", description: 'Gagne 500 XP au total' },
  xp_5000: { title: "Légende de l'XP", description: 'Gagne 5000 XP au total' },
};

const SHOP_FR: Record<string, Text> = {
  'Wooden Shield': { title: 'Bouclier en bois', description: 'Une protection de base' },
  'Pumpkin Hat': { title: 'Chapeau citrouille', description: 'Objet du mois — octobre 2026. Exclusivité Premium.' },
  'Autumn Scarf': { title: "Écharpe d'automne", description: 'Objet du mois — novembre 2026. Exclusivité Premium.' },
  'Winter Hat': { title: "Bonnet d'hiver", description: 'Objet du mois — décembre 2026. Exclusivité Premium.' },
  'Adventurer Scarf': { title: "Écharpe d'aventurier", description: 'Te tient chaud en quête' },
  'Iron Shield': { title: 'Bouclier de fer', description: 'Un bouclier solide' },
  'Steel Sword': { title: "Épée d'acier", description: 'Une lame fidèle' },
  'Magic Amulet': { title: 'Amulette magique', description: 'Elle brille de puissance' },
  'Royal Cape': { title: 'Cape royale', description: 'Une cape rouge qui flotte au vent' },
  'Flame Sword': { title: 'Épée de flammes', description: 'Elle brûle de fureur' },
  'Angel Wings': { title: "Ailes d'ange", description: 'Des ailes éthérées' },
  'Celestial Wings': { title: 'Ailes célestes', description: 'Des ailes de lumière' },
  'Mystic Aura': { title: 'Aura mystique', description: 'Une légère lueur magique' },
  Forest: { title: 'Forêt', description: 'Une forêt paisible' },
  Castle: { title: 'Château', description: 'Un grand château' },
  'Ocean Depths': { title: 'Abysses', description: 'Des eaux d’un bleu profond' },
  'Sunset Peaks': { title: 'Sommets au couchant', description: 'Des montagnes au crépuscule' },
  Volcano: { title: 'Volcan', description: 'Un volcan en fusion' },
  'Ice Cavern': { title: 'Caverne de glace', description: 'Un monde gelé' },
  'Neon City': { title: 'Ville néon', description: 'Un horizon cyberpunk' },
  Starfield: { title: 'Champ d’étoiles', description: 'Au milieu des étoiles' },
  'Adventurer Cap': { title: "Casquette d'aventurier", description: 'Une simple casquette pour débuter' },
  'Knight Helmet': { title: 'Heaume de chevalier', description: 'Un solide casque de fer' },
  'Pirate Tricorn': { title: 'Tricorne de pirate', description: 'Arr ! Un chapeau redoutable' },
  'Wizard Hat': { title: 'Chapeau de mage', description: 'Pointu et plein de mystère' },
  'Viking Helm': { title: 'Casque viking', description: 'Pour pillards et guerriers' },
  'Samurai Kabuto': { title: 'Kabuto de samouraï', description: 'Honneur et discipline' },
  'Crown of Champions': { title: 'Couronne des champions', description: 'Réservée aux plus dignes' },
  'Holy Halo': { title: 'Auréole sacrée', description: 'Un anneau de lumière' },
  'Dragon Horns': { title: 'Cornes de dragon', description: 'Des cornes de dragon légendaires' },
  'Peasant Clothes': { title: 'Habits de paysan', description: 'Des débuts modestes' },
  'Leather Armor': { title: 'Armure de cuir', description: 'Légère et souple' },
  'Forest Ranger': { title: 'Rôdeur des bois', description: 'Au cœur de la nature' },
  'Mage Robes': { title: 'Robe de mage', description: 'Un tissu enchanté' },
  'Ice Armor': { title: 'Armure de glace', description: 'Des plaques gelées et enchantées' },
  'Crimson Battlegear': { title: 'Tenue de combat pourpre', description: 'Forgée au combat' },
  'Golden Plate': { title: 'Armure dorée', description: 'Une armure d’or éclatante' },
  'Royal Vestments': { title: 'Habits royaux', description: 'Dignes d’un roi' },
  'Shadow Cloak': { title: "Cape d'ombre", description: "Tissée d'ombres" },
  'Medieval Kingdom': { title: 'Royaume médiéval', description: 'Pierre, or et lueur des torches.' },
  'Forest Temple': { title: 'Temple de la forêt', description: 'Bois anciens et verts apaisants.' },
  'Lifestyle': { title: 'Lifestyle', description: 'Clair, net et calme.' },
  'Cyberpunk City': { title: 'Cité cyberpunk', description: 'Néons et rues sombres.' },
  'Ocean Theme': { title: 'Thème Océan', description: 'Des tons bleus apaisants' },
  'Forest Theme': { title: 'Thème Forêt', description: 'Une palette verte naturelle' },
  'Sunset Theme': { title: 'Thème Couchant', description: 'Des teintes orangées chaleureuses' },
  'Neon Theme': { title: 'Thème Néon', description: 'Une lueur néon cyberpunk' },
  'Royal Theme': { title: 'Thème Royal', description: 'Violet et or, pour la royauté' },
};

const QUESTS_JA: Record<string, Text> = {
  'Easy Does It': { title: 'ゆっくりいこう', description: '習慣を1つ達成するだけ' },
  'First Step': { title: '最初の一歩', description: '今日、習慣を1つ達成する' },
  'Morning Starter': { title: 'いいスタート', description: 'どれか1つ達成して1日を始めよう' },
  'Quick Win': { title: 'クイックウィン', description: '今日、習慣を1つ以上達成する' },
  'All In': { title: '全力', description: '同じ日に習慣を4つ達成する' },
  'Habit Master': { title: '習慣マスター', description: '今日、習慣を5つ達成する' },
  'Streak Guardian': { title: '連続記録の守り手', description: 'すべての習慣の連続記録を守る' },
  'XP Grinder': { title: 'XP稼ぎ', description: '今日100 XP以上稼ぐ' },
  'Double Down': { title: 'ダブル', description: '習慣を2つ達成してやる気を証明しよう' },
  'Fitness Focus': { title: '運動に集中', description: '運動の習慣を1つ達成する' },
  'Healthy Mind': { title: '健やかな心', description: '健康の習慣を1つ達成する' },
  'Knowledge Seeker': { title: '知識の探求者', description: '学習の習慣を1つ達成する' },
  'Steady Progress': { title: 'コツコツ前進', description: '今日、習慣を2つ達成する' },
  'Triple Threat': { title: 'トリプル', description: '今日、習慣を3つ達成する' },
  'XP Hunter': { title: 'XPハンター', description: '今日30 XP以上稼ぐ' },
  'Inner Peace': { title: '心の平穏', description: 'マインドフルネスの習慣を1つ達成する' },
  'Getting Things Done': { title: 'やり遂げる', description: '生産性の習慣を1つ達成する' },
  'Eat Well': { title: 'しっかり食べる', description: '食事の習慣を1つ達成する' },
  'Well Rested': { title: 'ぐっすり', description: '睡眠の習慣を1つ達成する' },
  'Creative Spark': { title: 'ひらめき', description: '創作の習慣を1つ達成する' },
  'Good Company': { title: 'いい仲間', description: '人づきあいの習慣を1つ達成する' },
};

const ACHIEVEMENTS_JA: Record<string, Text> = {
  buy_1: { title: 'お客さま', description: '最初のアイテムを買う' },
  buy_5: { title: 'コレクター', description: 'アイテムを5つ持つ' },
  challenge_1: { title: 'チャレンジャー', description: '最初のチャレンジを終える' },
  challenge_win_1: { title: '勝者', description: '最初のチャレンジに勝つ' },
  complete_1: { title: '最初の一歩', description: '最初の習慣を達成する' },
  complete_10: { title: '走り出した', description: '累計10回達成する' },
  complete_100: { title: '習慣マシーン', description: '累計100回達成する' },
  complete_50: { title: '努力家', description: '累計50回達成する' },
  complete_500: { title: '止められない', description: '累計500回達成する' },
  equip_full: { title: 'フル装備', description: '4つのスロットすべてに装備する' },
  friend_1: { title: '社交的', description: '最初のフレンドを追加する' },
  friend_5: { title: 'リーダー', description: 'フレンドを5人つくる' },
  level_10: { title: 'チャンピオンへの道', description: 'レベル10に到達する' },
  level_5: { title: '成長中の修行者', description: 'レベル5に到達する' },
  streak_100: { title: 'センチュリオン', description: '100日連続を達成する' },
  streak_14: { title: '2週間のファイター', description: '14日連続を達成する' },
  streak_3: { title: 'コツコツ', description: '3日連続を達成する' },
  streak_30: { title: '1か月のマスター', description: '30日連続を達成する' },
  streak_7: { title: '1週間の戦士', description: '7日連続を達成する' },
  xp_100: { title: 'XPビギナー', description: '累計100 XP稼ぐ' },
  xp_1000: { title: 'XPベテラン', description: '累計1000 XP稼ぐ' },
  xp_500: { title: 'XPハンター', description: '累計500 XP稼ぐ' },
  xp_5000: { title: 'XPレジェンド', description: '累計5000 XP稼ぐ' },
};

const SHOP_JA: Record<string, Text> = {
  'Wooden Shield': { title: '木の盾', description: '基本の守り' },
  'Pumpkin Hat': { title: 'かぼちゃ帽子', description: '今月のアイテム — 2026年10月。プレミアム限定。' },
  'Autumn Scarf': { title: '秋のマフラー', description: '今月のアイテム — 2026年11月。プレミアム限定。' },
  'Winter Hat': { title: '冬のニット帽', description: '今月のアイテム — 2026年12月。プレミアム限定。' },
  'Adventurer Scarf': { title: '冒険者のマフラー', description: '冒険中も暖かい' },
  'Iron Shield': { title: '鉄の盾', description: '頑丈な盾' },
  'Steel Sword': { title: '鋼の剣', description: '頼れる刃' },
  'Magic Amulet': { title: '魔法のアミュレット', description: '力に輝く' },
  'Royal Cape': { title: '王家のマント', description: '風になびく赤いマント' },
  'Flame Sword': { title: '炎の剣', description: '怒りに燃える' },
  'Angel Wings': { title: '天使の翼', description: '天上の翼' },
  'Celestial Wings': { title: '天空の翼', description: '光の翼' },
  'Mystic Aura': { title: '神秘のオーラ', description: 'ほのかな魔法の光' },
  Forest: { title: '森', description: 'おだやかな森' },
  Castle: { title: '城', description: '壮大なお城' },
  'Ocean Depths': { title: '深海', description: '深い青の水底' },
  'Sunset Peaks': { title: '夕焼けの峰', description: '夕暮れの山々' },
  Volcano: { title: '火山', description: '燃えさかる火山' },
  'Ice Cavern': { title: '氷の洞窟', description: '凍てつく世界' },
  'Neon City': { title: 'ネオンシティ', description: 'サイバーパンクの街並み' },
  Starfield: { title: '星の海', description: '星々のただなかで' },
  'Adventurer Cap': { title: '冒険者の帽子', description: 'はじめての帽子' },
  'Knight Helmet': { title: '騎士の兜', description: '頑丈な鉄の兜' },
  'Pirate Tricorn': { title: '海賊の三角帽', description: '恐るべき帽子' },
  'Wizard Hat': { title: '魔法使いの帽子', description: 'とんがりで謎めいている' },
  'Viking Helm': { title: 'ヴァイキングの兜', description: '略奪者と戦士のために' },
  'Samurai Kabuto': { title: '侍の兜', description: '名誉と規律' },
  'Crown of Champions': { title: 'チャンピオンの王冠', description: 'ふさわしき者だけに' },
  'Holy Halo': { title: '聖なる光輪', description: '光の輪' },
  'Dragon Horns': { title: 'ドラゴンの角', description: '伝説のドラゴンの角' },
  'Peasant Clothes': { title: '村人の服', description: 'つつましい始まり' },
  'Leather Armor': { title: '革のよろい', description: '軽くてしなやか' },
  'Forest Ranger': { title: '森のレンジャー', description: '自然とともに' },
  'Mage Robes': { title: '魔導士のローブ', description: '魔法をかけた布' },
  'Ice Armor': { title: '氷のよろい', description: '魔法で凍らせた鎧' },
  'Crimson Battlegear': { title: '真紅の戦闘服', description: '戦いの中で鍛えられた' },
  'Golden Plate': { title: '黄金のよろい', description: 'まばゆい金の鎧' },
  'Royal Vestments': { title: '王の衣', description: '王にふさわしい' },
  'Shadow Cloak': { title: '影のマント', description: '影で織られた' },
  'Medieval Kingdom': { title: '中世の王国', description: '石と金と、たいまつの灯り。' },
  'Forest Temple': { title: '森の神殿', description: '古い木と深い緑。' },
  'Lifestyle': { title: 'ライフスタイル', description: 'すっきり、おだやか。' },
  'Cyberpunk City': { title: 'サイバーパンク都市', description: 'ネオンと夜の街。' },
  'Ocean Theme': { title: 'オーシャンテーマ', description: 'おだやかな青' },
  'Forest Theme': { title: 'フォレストテーマ', description: '自然な緑' },
  'Sunset Theme': { title: 'サンセットテーマ', description: 'あたたかなオレンジ' },
  'Neon Theme': { title: 'ネオンテーマ', description: 'サイバーパンクの輝き' },
  'Royal Theme': { title: 'ロイヤルテーマ', description: '紫と金、王族のために' },
};

type Maps = Partial<Record<Lang, Record<string, Text>>>;

function pick(maps: Maps, key: string, lang: Lang, fallback: Text): Text {
  return maps[lang]?.[key] ?? fallback;
}

export function questText(lang: Lang, template: { title: string; description: string }): Text {
  return pick({ fr: QUESTS_FR, ja: QUESTS_JA }, template.title, lang, template);
}

export function achievementText(
  lang: Lang,
  achievement: { key?: string | null; name: string; description: string },
): Text {
  return pick({ fr: ACHIEVEMENTS_FR, ja: ACHIEVEMENTS_JA }, achievement.key ?? '', lang, {
    title: achievement.name,
    description: achievement.description,
  });
}

export function shopItemText(lang: Lang, item: { name: string; description?: string | null }): Text {
  return pick({ fr: SHOP_FR, ja: SHOP_JA }, item.name, lang, { title: item.name, description: item.description ?? '' });
}

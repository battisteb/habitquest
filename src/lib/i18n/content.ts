import type { Lang } from './index';

/**
 * French versions of the game content seeded in English in the database
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

function pick(map: Record<string, Text>, key: string, lang: Lang, fallback: Text): Text {
  return (lang === 'fr' && map[key]) || fallback;
}

export function questText(lang: Lang, template: { title: string; description: string }): Text {
  return pick(QUESTS_FR, template.title, lang, template);
}

export function achievementText(
  lang: Lang,
  achievement: { key?: string | null; name: string; description: string },
): Text {
  return pick(ACHIEVEMENTS_FR, achievement.key ?? '', lang, {
    title: achievement.name,
    description: achievement.description,
  });
}

export function shopItemText(lang: Lang, item: { name: string; description?: string | null }): Text {
  return pick(SHOP_FR, item.name, lang, { title: item.name, description: item.description ?? '' });
}

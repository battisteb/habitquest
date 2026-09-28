# Revue d'utilisation — 2026-09-28

Parcours testés en conditions réelles (version web, viewport iPhone 390×844, en français) :
- un **nouvel utilisateur** : inscription → intro → héros → première quête → tutoriel ;
- un **joueur installé** (niveau 5, 5 habitudes, 5 amis, défi en cours) : toutes les pages.

Légende : 🔴 bloquant pour la rétention · 🟠 important · 🟡 finition.

## Déjà corrigé

- 🔴 **Les célébrations n'apparaissaient jamais** (montée de niveau, toast « +XP », explosion de validation, palier de série global) : bug d'animation, sur toutes les plateformes. Or c'est le cœur de la boucle de jeu. → PR #27.
- 🟠 Une fois réparés : titres français coupés (« NIVEAU SUPÉRIEUR ! », « SÉRIE DE 2 SEMAINES ! »), carte de palier qui grossissait à 2-3× et **double célébration** du même palier (overlay + modale de l'écran du jour). Le toast affichait aussi un gain estimé côté client au lieu du vrai gain serveur. → corrigé dans la PR #27.

## 1. Premiers jours (rétention J1-J7)

- 🔴 **Quêtes du jour impossibles pour un débutant.** Après l'onboarding (1 habitude « Boire 2L d'eau »), on reçoit « Valide une habitude d'apprentissage » (il n'en a aucune) et « Gagne 100 XP aujourd'hui » (1 habitude = 11 XP). Échec garanti dès le premier jour, ce qui est très démotivant. → Tirer les quêtes selon les catégories et le nombre d'habitudes du joueur ; objectifs d'XP proportionnels.
- 🟠 **Une seule habitude à l'onboarding.** Le choix rapide est à sélection unique ; l'écran du jour est presque vide et les quêtes « 2-3 habitudes » sont hors de portée. → Permettre d'en cocher 2 ou 3.
- 🟠 **Niveau 0 au départ** (« Lv.0 », « NIV 0 ») : on démarre à zéro, ce qui sonne comme « rien ». → Afficher niveau 1 (décalage d'affichage uniquement).
- 🟠 **Pas d'invitation d'amis.** Tout le social (classement, duels, défis) est vide tant qu'on n'a pas d'amis, et l'ajout se fait uniquement par recherche de pseudo. → Lien d'invitation partageable (« Rejoins-moi sur HabitQuest ») dès l'onboarding et depuis le classement vide. C'est aussi le meilleur levier de croissance.

## 2. Cohérence et compréhension

- 🟠 **Deux échelles de rangs contradictoires** : le profil annonce « Prochain : Chevalier au niveau 10 » (évolution de l'avatar) alors que le parcours XP dit « Prochain : niv. 7 » (rang). Un seul système, ou des noms différents pour l'avatar.
- 🟠 **Le bonus de série affiché est trompeur** : le parcours XP montre « ×3,1 → 31 XP par habitude » (calculé sur la meilleure série), alors que chaque habitude rapporte selon sa propre série (ex. +23 XP). → Afficher « jusqu'à … » ou le bonus par habitude.
- 🟠 **« Quêtes » désigne deux choses** : les habitudes (onglet « Quêtes », « Toutes les quêtes sont faites ! ») et les quêtes du jour (« 0/3 »). La bannière « Toutes les quêtes sont faites » s'affiche alors que les quêtes du jour ne sont pas réclamées. → Réserver « quêtes » à l'un des deux (ex. « habitudes du jour » + « quêtes du jour »).
- 🟡 **Les thèmes se voient à peine** : dans les réglages, passer de « Dark Dungeon » à « Cyberpunk City » ne change quasiment rien à l'écran (seul un interrupteur change de couleur). Si les thèmes sont un avantage Premium, ils doivent se voir immédiatement (fond, couleurs principales).

## 3. Fonctions à revoir

- 🔴 **Onglet Entraînement inutilisable pour le grand public** : l'état vide demande de « créer un fichier JSON » et de l'importer. → Masquer l'onglet au lancement, ou proposer des séances/decks prêts à l'emploi et un éditeur simple.
- 🟠 **« Combat rapide (démo) »** visible en production : ça fait « pas fini », et le combat ne rapporte rien. → Le renommer « Entraînement » (sans récompense), ou le retirer.
- 🟡 **Récap hebdo le lundi** : « Habitude star : 1 fois cette semaine », « −31 XP vs la semaine dernière » après un seul jour. → Le lundi, montrer la semaine précédente complète.

## 4. Finitions (français)

- 🟡 En-tête « AUJOURD'HUI » trop large : le bouton « + » est coupé à droite sur iPhone.
- 🟡 Textes restés en anglais : noms et descriptions des thèmes (« Dark Dungeon — The classic dark pixel art theme »), catégories des modèles d'habitudes (« HEALTH », « SLEEP »), étiquettes des modes focus (« learning », « studies », « sport »), paywall (« 1 stored · plein tarif »).
- 🟡 Onglets horizontaux coupés sans indication (Social : « RECHERCHE » à moitié visible ; Boutique : catégories) → un léger dégradé en bord d'écran signale qu'on peut faire défiler.

## Ce qui marche très bien

- L'onboarding est court, clair, et la personnalisation du héros est un vrai moment « waouh ».
- La boucle quotidienne (cocher → XP → série → quêtes du jour à réclamer) est lisible et satisfaisante, surtout avec les célébrations réparées.
- Le podium du classement, les défis avec mise, les succès et le calendrier des stats donnent envie de revenir.
- L'économie est désormais incontournable côté serveur (pas de triche possible).

## Ordre conseillé

1. Quêtes du jour adaptées au joueur + 2-3 habitudes à l'onboarding (rétention J1).
2. Lien d'invitation d'amis (rétention + croissance).
3. Onglet Entraînement masqué ou simplifié, « démo » renommée.
4. Cohérence rangs / bonus / vocabulaire « quêtes ».
5. Finitions FR et thèmes plus visibles.

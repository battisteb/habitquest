# ADR 010 — Corrections issues de la revue d'utilisation

**Date** : 2026-09-28
**Statut** : Décidé (demande de Battiste : « corrige tous les points de ta revue »)

Voir `docs/ux-review.md` pour le constat. Ce document garde la trace des décisions de conception et de **balance**.

## Missions du jour adaptées au joueur

Les missions (ex-« quêtes du jour ») étaient tirées au hasard : un débutant avec une habitude « santé » recevait « valide une habitude d'apprentissage » et « gagne 100 XP ». `assign_daily_quests` tire désormais dans `feasible_quest_templates` :
- nombre d'habitudes demandé ≤ habitudes actives ;
- catégorie demandée = catégorie possédée ;
- XP demandée ≤ XP obtenue en validant toutes ses habitudes (séries comprises).

Six missions de catégorie ont été ajoutées (bien-être, productivité, nutrition, sommeil, créativité, social). Sans habitude, aucune mission n'est attribuée.

## Vocabulaire

« Quête » = une habitude (promesse de la marque : chaque habitude est une quête). Les quêtes du jour deviennent les **missions du jour**.

## Niveaux à partir de 1 (balance)

- Les joueurs commencent au **niveau 1** ; le niveau N demande `LEVEL_THRESHOLDS[N-1]` XP, puis un niveau tous les 2000 XP au-delà de 6000.
- Le rang Légende (niveau 11) était **inatteignable** : `level_for_xp` plafonnait à 10. Il l'est maintenant à 6000 XP.
- Les rangs gardent leurs niveaux (Novice 1, Apprenti 3, Guerrier 5, Chevalier 7, Champion 9, Légende 11), ce qui les rend un peu plus accessibles en XP (Apprenti 250 au lieu de 500, Chevalier 1900 au lieu de 2600). Les succès « niveau 5 / 10 » et les niveaux requis de la boutique gardent leurs nombres, donc arrivent légèrement plus tôt.
- Formule dupliquée à l'identique : `game-config.ts` (`getLevelForXp`, `getXpForLevel`) et SQL (`level_for_xp`). `increment_xp` et `apply_punishment` passent par `award()`.

## Évolution de l'avatar

Les paliers d'avatar (1/5/10/15/20/30) contredisaient les rangs (Chevalier au niveau 10 d'un côté, au niveau 7 de l'autre) et le palier « légende » demandait 44 000 XP. L'avatar suit désormais les rangs, avec un effet visuel débloqué à chaque rang.

## Invitations d'amis

Lien `https://habitquest.expo.app/invite/<code>` avec un **code secret** par joueur (`invite_codes`, lisible uniquement par son propriétaire). Partager le lien vaut consentement : l'ouvrir crée une amitié acceptée et notifie l'inviteur. Un pseudo n'aurait pas suffi : n'importe qui aurait pu devenir ami avec n'importe qui.

## Écrans masqués ou renommés

- Entraînement (import de fichiers JSON) : plus de lien depuis la création d'habitude ; l'onglet reste caché.
- « Combat rapide (démo) » → « Combat d'entraînement » (sans récompense).

## Thèmes

Le thème sauvegardé est appliqué au chargement de la palette (`tokens.ts`), avant la création des styles statiques ; Réglages, boutons et champs recalculent leurs styles quand le thème change. Les cartes de thème montrent un aperçu des couleurs.

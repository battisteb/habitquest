# Proposition — Guildes et défis coop

**Statut** : proposition à valider par Battiste. Réponds « OK » ou corrige les points que tu veux ; les valeurs par défaut sont en **gras**.

## Pourquoi

Aujourd'hui, le social est uniquement compétitif (duels, défis 1 contre 1, classement). Le coop ajoute de l'entraide : on valide ses habitudes aussi pour ne pas lâcher son équipe. C'est un des leviers de rétention les plus forts dans les apps d'habitudes.

## 1. Défis coop (à faire en premier : simple, réutilise les défis existants)

- Entre **2 et 4 amis**.
- Objectif commun, au choix du créateur :
  - **nombre total de validations** (ex. 30 validations à 3 en une semaine) ;
  - ou XP cumulée.
- Durée : **3, 7 ou 14 jours**.
- Réussite : chaque participant gagne **+50 % de l'XP de base** du défi et un badge. Échec : rien n'est perdu.
- Pas de mise d'or, pour que ça reste bienveillant.
- Progression calculée par le serveur, comme les défis actuels (`complete_habit`).
- Limite : **1 défi coop actif à la fois** (2 en Premium).

## 2. Guildes

**Composition**
- **Jusqu'à 10 membres**. Une guilde a un nom, un emblème pixel et une description.
- Rôles :
  - **chef** : invite, exclut, renomme, transmet le rôle ;
  - **officiers** (jusqu'à 2) : peuvent inviter ;
  - **membres**.
- Entrée **sur invitation** (lien ou pseudo) ; option guilde « ouverte » plus tard.
- Un joueur n'est que dans **1 guilde** à la fois ; il peut la quitter à tout moment.

**Quête de guilde hebdomadaire**
- Chaque lundi, une quête commune dont l'objectif dépend du nombre de membres (ex. « 60 validations cette semaine »).
- Chaque validation d'un membre fait avancer la barre.
- Si la quête est réussie :
  - chaque membre ayant contribué au moins **3 fois** reçoit de l'or ;
  - la guilde gagne des **points de prestige** (niveau de guilde, cosmétiques d'emblème).

**Classement des guildes**
- Classement hebdomadaire du prestige gagné, remis à zéro chaque lundi (comme le classement actuel).

**Communication**
- **Pas de chat libre au lancement** : ça évite la modération et une classification d'âge plus élevée sur les stores.
- À la place, des **réactions rapides** (👏 🔥 💪) sur le fil d'activité de la guilde (« Alice a validé Méditer, série de 12 »).

**Sécurité / anti-triche**
- Tout est calculé côté serveur (même principe que l'ADR 008).
- RLS : seuls les membres voient le fil de leur guilde.

## 3. Ordre de réalisation proposé

1. Défis coop (~1 PR : tables, RPC, écran de création et suivi).
2. Guildes : création, invitations, rôles, fil d'activité (~2 PR).
3. Quête de guilde hebdomadaire + prestige + classement (~1 PR).

## Questions ouvertes

1. Les valeurs en gras te conviennent ?
2. Les guildes doivent-elles être réservées au Premium, ou gratuites avec un avantage Premium (ex. créer une guilde = Premium, rejoindre = gratuit) ? Je propose : **tout gratuit**, Premium = bonus de prestige ×1,5.
3. Chat libre un jour : oui ou non ?

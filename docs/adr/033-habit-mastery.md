# ADR 033 — La maîtrise des habitudes

**Date** : 2026-10-14
**Statut** : accepté. Battiste a validé le point 5 des idées du 13/10, en voulant récompenser la régularité plutôt que le niveau, et des objectifs modifiables même pour les habitudes personnalisées.

## Contexte

Une habitude n'était qu'un texte (« Courir 20 min »). L'app ne pouvait ni connaître ni faire évoluer sa difficulté. Pour changer de durée, il fallait créer une habitude personnalisée. Battiste voulait que « 5 km » puisse valoir plus que « 2 km », sans récompenser le niveau en lui-même : c'est la régularité qui compte.

Les comparaisons entre joueurs (5 km contre 2 km) sont invérifiables et poussent à viser trop haut. On compare donc le joueur **à lui-même** : il monte sa propre barre, une fois la régularité prouvée.

## Décision

- **Un objectif optionnel sur chaque quête** : un nombre et une unité (`min`, `h`, `km`, `pages`, `steps`, `reps`, `glasses`, `servings`, `times`), dans `habits.goal_value` et `habits.goal_unit`.
  - Les idées avec un nombre le pré-remplissent (« Lire 20 min » → 20 min).
  - Le champ est modifiable à la création comme à l'édition. Changer le nombre change aussi le nombre dans le nom.
  - Une quête sans nombre (« Méditer ») reste valable, elle n'a simplement pas d'étoiles.
- **Maîtrise** : après **21 jours d'affilée**, la page de la quête propose de monter la barre (environ +25 %, sur un pas naturel pour l'unité : 20 → 25 min, 10 000 → 13 000 pas). Si le joueur accepte :
  - la quête gagne une **étoile** (jusqu'à 3) ;
  - **sa série continue** ;
  - le nombre dans le nom suit ;
  - ses validations complètes rapportent **+20 % d'XP**. Le bonus est le même pour 1, 2 ou 3 étoiles, et ne s'applique pas à la version mini.

  L'étoile suivante demande à nouveau 21 jours. « Plus tard » repousse l'offre d'une semaine.
- **Serveur** (ADR 008) :
  - `raise_habit_goal(habit, valeur)` vérifie le propriétaire, la série d'au moins 21 jours, les 21 jours depuis la dernière étoile et une valeur plus haute (au plus le triple), puis donne l'étoile.
  - Le trigger `guard_habit_mastery` empêche le joueur d'écrire les étoiles lui-même.
  - `complete_habit` applique le bonus.
  - Miroir app : `MASTERY` dans `game-config.ts`.
- **App** : champ « Objectif chiffré » dans la création et l'édition, ★ sur la carte de la quête, carte « 21 jours d'affilée ! Prêt à passer de 20 min à 25 min ? » sur la page de la quête. Elle remplace l'ancien message « Prêt à passer au niveau supérieur ? » quand les deux s'appliquent. Textes en 5 langues.

## Conséquences

- Le bonus reste petit face au multiplicateur de série (×5 à 40 jours) : il récompense le fait de progresser sans écraser la régularité.
- Le joueur peut baisser son objectif lui-même : il garde ses étoiles, mais chaque étoile demande de toute façon 21 jours d'affilée.
- Le nom n'est renommé que s'il contient exactement le nombre (« Marcher 10 000 pas » avec une espace reste tel quel).
- Migration `20261014140000_habit_mastery.sql`, tests `habit-mastery.test.sql` (12) et `mastery.test.tsx`.

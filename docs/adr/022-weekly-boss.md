# ADR 022 — Le boss de la semaine

**Date** : 2026-10-03
**Statut** : accepté (idée I9 de l'étude concurrentielle, validée par Battiste)

## Contexte

Les quêtes du jour donnent un objectif quotidien. Il manquait un objectif à la semaine, avec une petite histoire, pour donner envie de tenir jusqu'au dimanche. Les concurrents qui « racontent » la régularité (boss, chapitres) retiennent mieux leurs joueurs.

## Décision

- **Chaque semaine, un boss** : une mauvaise habitude en monstre (le Golem Roupillon, le Kraken Défilant, le Troll du Canapé, le Gobelin Grignote), en rotation, avec un sprite pixel 16×16 et une courte histoire en français et en anglais.
- **Chaque quête validée de la semaine lui inflige 10 dégâts.**
- **Ses PV valent 8 par validation prévue cette semaine** :
  - une quête quotidienne compte pour 7 ;
  - une quête à jours choisis compte pour son nombre de jours ;
  - une quête « N fois par semaine » compte pour N ;
  - minimum 5.

  Environ 80 % de la semaine suffit donc à le vaincre.
- **Victoire** : +50 XP et +25 or, payés une seule fois, avec une notification dans la langue du joueur.
- **Serveur** (ADR 008) : table `weekly_boss_runs` (lecture seule pour le joueur), `get_weekly_boss()`, et un trigger sur `completions` qui recompte les dégâts depuis les validations de la semaine. Recompter plutôt qu'incrémenter garde le compte juste quand une quête est décochée (R11). Les PV sont fixés à la création de la semaine. `complete_habit` n'est pas modifiée. Le miroir côté app est `BOSS` dans `game-config.ts`.
- **App** : une carte compacte sous les missions du jour (sprite, nom, PV). Le boss tremble quand une quête le touche, et un appui montre son histoire et ce qu'il reste à faire.

## Conséquences

- La récompense passe par `award` dans le trigger : une montée de niveau due au boss est bien signalée par `complete_habit`, qui lit le niveau avant la validation.
- En solo pour l'instant. La version « entre amis » (un boss partagé) pourra réutiliser la même table avec un groupe.
- Migration `20261003220000_weekly_boss.sql`, tests `weekly-boss.test.sql` (11) et `boss.test.tsx`.

# ADR 031 — Le boss de la semaine à 70 %

**Date** : 2026-10-14
**Statut** : accepté (Battiste, « OK pour le boss à 70 % »). Remplace le calcul des PV de l'ADR 022.

## Contexte

Une simulation de l'économie a été faite le 2026-10-13, avec les règles du serveur. Elle couvre 5 profils de joueurs, sur 60 jours, 400 fois chacun, avec 3 quêtes quotidiennes. Le script est dans `HabitQuest - reprise/outils/economy-sim.js`.

Elle montre que le boss de l'ADR 022 (8 PV par validation prévue, environ 80 % de la semaine) était trop dur pour des joueurs pourtant sérieux :

| Profil | Validations | Boss battus (8 semaines) |
|---|---|---|
| Assidu | 95 % | 8 |
| Régulier | 80 % | 5 |
| Tout en semaine, rien le week-end | 71 % | 0 |
| Irrégulier | 55 % | 0 |

Le boss doit récompenser une bonne semaine, pas une semaine parfaite.

## Décision

- **Les PV valent 7 par validation prévue cette semaine** au lieu de 8. Le minimum reste de 5 validations prévues. Chaque validation inflige toujours 10 dégâts, et la récompense ne change pas (+50 XP, +25 or).
- Il faut donc environ **70 % des quêtes de la semaine** pour le vaincre. Avec 3 quêtes quotidiennes, c'est 15 validations sur 21 au lieu de 17.
- **Les boss en cours** (semaine actuelle, pas encore vaincus) passent aux nouveaux PV. Ils tombent à la validation ou à la visite suivante si les dégâts déjà faits suffisent.
- **Miroir app** : `BOSS.HP_PER_PLANNED = 7` dans `game-config.ts`.

## Conséquences

- Même simulation à 7 PV par validation : assidu 8 boss sur 8, régulier 7 sur 8, « saute le week-end » 5 sur 8, joueur qui décroche puis revient 5 sur 8, irrégulier 1 sur 8.
- La récompense hebdomadaire reste modeste : moins de 3 % de l'XP totale selon la simulation. L'économie générale ne bouge presque pas.
- Les jours de repos et les jours gelés ne comptent toujours pas comme des coups. À revoir si les joueurs « Saute le week-end » restent bloqués.
- Migration `20261014090000_weekly_boss_70.sql`, test `weekly-boss.test.sql` mis à jour.

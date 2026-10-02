# ADR 016 — Quêtes sur des jours choisis, et séries des quêtes « N fois par semaine »

**Date** : 2026-10-02
**Statut** : accepté (demande R15 de Battiste)

## Contexte

Les quêtes avaient deux fréquences : « chaque jour » et « N fois par semaine » (2 à 5). Battiste veut que le joueur puisse choisir ses jours (« lundi, mercredi, vendredi »), que la quête n'apparaisse que ces jours-là et que la série en tienne compte.

En regardant les règles de série, un défaut est apparu : côté serveur, la série d'une quête « N fois par semaine » était comptée comme celle d'une quête quotidienne. Elle se cassait, avec la pénalité d'XP et d'or, dès le premier jour sans validation, alors que sauter des jours est justement le principe de cette fréquence.

## Décision

- **Nouvelle fréquence `days`** avec la colonne `habits.days` : jours ISO, de 1 (lundi) à 7 (dimanche), entre 1 et 6 jours. Choisir les 7 jours enregistre « chaque jour ». Une contrainte vérifie la cohérence fréquence / jours.
- **Jours de repos** : la quête n'apparaît pas sur l'écran Quêtes et ne peut pas être validée ; le serveur renvoie `not_scheduled`. Un jour de repos ne casse jamais la série : la série compte les jours prévus validés d'affilée.
- **Une seule règle de série côté serveur**, `habit_missed_days(joueur, quête, dernière validation, aujourd'hui)` : elle renvoie les jours dus manqués et non gelés. Liste vide = la série continue. Elle est utilisée par `complete_habit` et par `process_streak_breaks`, dont les gels automatiques (ADR 015) couvrent exactement ces jours.
  - Chaque jour / jours choisis : les jours dus de l'écart sans gel.
  - N fois par semaine : chaque semaine terminée depuis la dernière validation doit avoir atteint son objectif. Un jour gelé compte comme un jour fait, et la semaine de création est proratisée : une quête créée samedi ne demande que 2 validations cette semaine-là. Le manque est reporté sur les derniers jours libres de la semaine.
- **Missions du jour** : seules les quêtes dues aujourd'hui comptent, pour la faisabilité des missions et pour « valider toutes ses quêtes ».
- **Création** : « Certains jours » propose désormais les 7 jours au lieu du compteur « N fois par semaine ». Les quêtes « N fois par semaine » existantes et les modèles continuent de fonctionner ; à l'édition, une ancienne quête garde son option.

Les montants d'XP et d'or ne changent pas.

## Conséquences

- Les joueurs « 3 fois par semaine » ne perdent plus leur série (ni XP ni or) les jours où ils ne doivent rien faire.
- Les statistiques ne comptent plus une quête comme « due » ses jours de repos.
- `uncomplete_habit` (R11) n'est pas concernée : elle rétablit la validation précédente.
- Migration `20261002210000_habit_weekdays.sql`, tests pgTAP `habit-weekdays.test.sql`.

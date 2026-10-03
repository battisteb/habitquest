# ADR 026 — Budget de notifications : 2 par jour

**Date** : 2026-10-03
**Statut** : Décidé (Battiste, allègement D10)

## Contexte

Trop de notifications font désactiver les notifications, puis désinstaller l'appli. Sur une journée chargée, HabitQuest pouvait envoyer :
- le rappel du matin ;
- l'alerte de série de 20 h ;
- le récap du dimanche à 20 h, en même temps que l'alerte ;
- une notification push pour chaque événement social : demande d'ami, duel, coop, boss…

## Décision

- **Rappels du téléphone : 2 par jour au plus.**
  - Le rappel du matin, à l'heure choisie ou adaptée.
  - L'alerte de série de 20 h, seulement si une série est en danger.
  - Le dimanche, le récap de la semaine, à 18 h, remplace le rappel du matin. Le rappel quotidien devient donc un déclencheur hebdomadaire par jour (`daily-reminder-1` à `-7`), et le dimanche est sauté quand le récap est activé.
  - Règle et constantes : `src/features/notifications/utils/notification-budget.ts`.
- **Notifications push du serveur : 2 par joueur sur 24 h glissantes.**
  - La colonne `notifications.pushed` est décidée avant l'écriture par `decide_notification_push`. Un verrou par joueur empêche que deux notifications simultanées prennent toutes les deux la dernière place.
  - Au-delà de 2, la notification arrive quand même dans la boîte de l'app, mais sans push.
  - Migration : `20261004100000_push_daily_cap`.
- Les **rappels par quête** sont des alarmes que le joueur a lui-même réglées : ils ne sont pas comptés.
- La fonction `daily-streak-alert` n'est pas planifiée en production (pas de `pg_cron`) et ne doit pas l'être : elle ferait doublon avec l'alerte locale de 20 h.

## Conséquences

- Au pire, un joueur reçoit 2 rappels et 2 notifications sociales par jour. Un joueur sans amis actifs en reçoit au plus 2.
- Rien n'est perdu : tout reste visible dans la boîte de notifications.
- Tests :
  - `notification-budget.test.ts` vérifie toutes les combinaisons de réglages ;
  - `supabase/tests/push-cap.test.sql`.

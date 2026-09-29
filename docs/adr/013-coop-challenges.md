# ADR 013 — Défis coop

**Date** : 2026-09-29
**Statut** : Décidé (Battiste : « défi coop oui, guildes non », valeurs de `docs/game-design/guilds-and-coop.md`)

## Contexte

Les défis existants opposent deux amis. Battiste veut aussi un mode où l'on s'entraide : un objectif commun entre amis. Les guildes ont été abandonnées (et donc le chat).

## Décision

**Règles**
- De **2 à 4 joueurs** : le créateur invite 1 à 3 amis (amitié acceptée obligatoire).
- **Objectif commun** au choix : nombre total de **validations** (3 à 200) ou **XP** cumulée (30 à 5 000).
- **Durée** : 3, 7 ou 14 jours.
- Le défi **démarre quand le premier ami accepte** ; ceux qui acceptent ensuite le rejoignent en cours de route. Si tout le monde refuse, il est annulé. Une invitation sans réponse pendant 7 jours est annulée.
- **Réussite** : chaque membre gagne **+50 % de l'XP qu'il a gagnée pendant le défi**. La récompense suit l'effort de chacun : celui qui n'a rien fait ne gagne rien.
- **Échec** : rien n'est perdu. Pas de mise d'or.
- **Limite** : 1 défi coop à la fois (en attente ou en cours), **2 en Premium**.
- L'app propose un objectif équilibré : environ une validation par joueur et par jour (10 XP par validation pour un objectif en XP). Le joueur peut l'ajuster.

**Technique**
- Tables `coop_challenges` et `coop_members`, sans policy : tout passe par les RPC `create_coop_challenge`, `respond_coop_challenge`, `cancel_coop_challenge` et `get_coop_challenges` (security definer, appelant vérifié).
- La progression vient d'un **trigger sur `completions`** plutôt que d'une modification de `complete_habit` : la fonction centrale de l'économie (ADR 008) reste intacte. Seules les validations faites pendant le défi et par des membres ayant accepté comptent.
- L'expiration (défi échoué, invitation périmée) est faite à la volée par les RPC, sans tâche planifiée.
- Notifications (et donc push) : invitation, ami qui rejoint, défi réussi. Elles ouvrent `/coop/<id>`.
- Les bornes et la limite sont reprises dans `COOP` (`game-config.ts`) et `LIMITS` (`feature-gates.ts`) pour l'app ; le serveur fait foi.

## Limites connues

- Les textes des notifications générés par le serveur sont en anglais (comme les autres notifications serveur).
- La récompense coop est versée pendant la validation qui termine le défi : si elle fait monter de niveau, la célébration de niveau n'est pas affichée à ce moment-là.
- Pas de badge dédié pour l'instant.

## Tests

`supabase/tests/coop.test.sql` (pgTAP, 18 assertions) : invitation réservée aux amis, bornes, limite gratuite, pas de progression avant le départ, démarrage à la première acceptation, durée, annulation, progression de tous les membres, réussite et récompense, notifications, refus et annulation automatique, accès direct refusé. Côté app : `src/features/coop/__tests__` (objectif proposé, bornes, écrans).

## Déploiement

Migration `20260930110000_coop_challenges.sql`.

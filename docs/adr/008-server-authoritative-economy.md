# ADR 008 — Économie calculée par le serveur

**Date** : 2026-09-27
**Statut** : Décidé (demande de Battiste : « solide, peu importe comment »)

## Contexte

L'XP, l'or, les niveaux, les séries, la progression des quêtes du jour et des défis étaient calculés par l'app puis écrits dans la base. La policy « Users can update own profile » laissait même un joueur écrire directement `xp`, `gold`, `level` ou `subscription_status`. Classements, duels et défis pouvaient donc être faussés par n'importe qui.

## Décision

La base devient la seule source de vérité de l'économie.

| Action | Avant | Maintenant |
|---|---|---|
| Valider une habitude | le client calculait XP, or, série et écrivait tout | RPC `complete_habit` : limite par jour/semaine locale, série, XP, or, niveau, meilleure série, progression des défis et des quêtes |
| Série cassée | le client remettait à 0 et appelait `apply_punishment` | RPC `process_streak_breaks` (idempotente) |
| Gel de série | stocké uniquement sur le téléphone | table `streak_freezes` + RPC `activate_streak_freeze` : 1 gratuit par semaine, puis un jeton gagné avec une pub |
| Succès | le client ajoutait XP et or | trigger sur `user_achievements` : récompense du catalogue, une seule fois |
| Duel | le client ajoutait or et XP | RPC `claim_duel_reward`, une fois par joueur ; 2 duels max par semaine ; le vainqueur doit être un des deux joueurs ; résultat figé une fois résolu |
| Quêtes du jour | le client écrivait la progression | calculée dans `complete_habit` ; attribution par jour local ; `claim_daily_quest` en security definer |
| Défis | le client écrivait sa progression et se déclarait vainqueur | progression, victoire, mise et notifications dans `complete_habit` ; le client ne peut plus qu'accepter ou annuler |
| Premium | le client écrivait son statut | webhook RevenueCat (`revenuecat-webhook`) |

Garde-fous :
- `profiles` : seules les colonnes `username`, `skin_color`, `hair_color`, `eye_color` et `active_theme` restent modifiables par le client ; `completions`, `streaks`, `user_daily_quests` et `streak_freezes` sont en lecture seule côté client.
- `increment_xp`, `add_gold`, `apply_punishment` et le helper interne `award` ne sont plus exécutables par les clients.
- « Aujourd'hui » est le jour local du joueur : colonne `profiles.timezone`, envoyée par l'app (`set_timezone`).
- `profiles.email` est supprimée : la table est lisible par tous les joueurs, et l'adresse reste dans `auth.users`.

Les formules (`level_for_xp`, `rank_for_level`, XP par validation, pénalités) reprennent à l'identique celles de `src/lib/constants/game-config.ts` et `punishment.ts`. **Toute modification de la balance doit désormais être faite aux deux endroits.**

## Limites connues

- Le déblocage d'un succès n'est pas revérifié par le serveur. Le gain reste borné : chaque succès ne rapporte qu'une fois, et le catalogue est fini.
- Le combat d'un duel est simulé sur le téléphone, donc le vainqueur déclaré n'est pas vérifié. C'est borné par la limite de 2 duels par semaine et par une récompense unique.
- Changer le fuseau horaire décale le « jour » d'au plus 24 h.

## Tests

`supabase/tests/economy.test.sql` (pgTAP, 51 assertions, `supabase test db`) : validations, doublons, écritures directes refusées, séries, gels, pénalités, défis, duels, quêtes, succès, fuseau horaire.

## Déploiement

- Migration `20260927130000_server_authoritative_economy.sql` (après celles des ADR 006 et 007).
- `supabase functions deploy revenuecat-webhook --no-verify-jwt`, puis `supabase secrets set REVENUECAT_WEBHOOK_SECRET=…` et configuration du webhook dans RevenueCat.
- L'app doit être mise à jour en même temps : les anciennes versions ne peuvent plus écrire l'économie.

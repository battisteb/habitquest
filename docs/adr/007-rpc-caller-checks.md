# ADR 007 — Contrôle de l'appelant dans les RPC

**Date** : 2026-09-27
**Statut** : Décidé

## Contexte

Les fonctions `security definer` (`add_gold`, `increment_xp`, `apply_punishment`, `add_freeze_token`, `purchase_item`) contournent la RLS et recevaient l'identifiant de l'utilisateur à modifier depuis le client. N'importe quel joueur connecté pouvait donc vider l'or d'un autre, lui retirer de l'XP ou acheter des objets avec son or. Le seul transfert légitime entre joueurs était la mise d'un défi, où le gagnant appelait `add_gold(perdant, -mise)`.

## Décision

- Helper `assert_caller_is(p_user_id)` : exige `p_user_id = auth.uid()` (le service role est exempté). Appelé en tête de chaque RPC ; les signatures ne changent pas.
- Nouvelle RPC `settle_challenge_wager(p_challenge_id)` : seul le gagnant d'un défi `completed` peut encaisser, une seule fois (`challenges.wager_settled`), avec plancher à 0 pour le perdant. Le client clôture le défi puis encaisse.
- `purchase_item` verrouille la ligne du profil (`for update`) pour éviter deux achats simultanés avec le même or.
- `add_freeze_token` reçoit enfin un `search_path` fixe.
- `EXECUTE` retiré à `anon` / `public`.

## Hors périmètre (question produit ouverte)

L'économie reste calculée côté client : un joueur peut toujours gonfler **son propre** XP / or (RPC avec montants libres, et la policy « Users can update own profile » autorise la mise à jour directe de `profiles.xp`, `gold`, `level`…). Cela fausse les classements et les duels. La correction complète (récompenses calculées par la base à la validation d'une habitude, colonnes d'économie non modifiables par le client) est un chantier à part.

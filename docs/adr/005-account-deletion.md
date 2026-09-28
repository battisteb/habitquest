# ADR 005 — Suppression de compte

**Date** : 2026-09-27
**Statut** : Décidé

## Contexte

L'App Store exige qu'une app permettant de créer un compte permette aussi de le supprimer depuis l'app (règle 5.1.1(v)). Le client ne peut pas supprimer un utilisateur `auth.users` avec la clé anonyme.

## Décision

- **Edge Function `delete-account`** : identifie l'utilisateur à partir de son propre JWT (jamais d'un identifiant envoyé dans le corps), puis appelle `auth.admin.deleteUser` avec la clé service role.
- **Suppression définitive (hard delete)** : `profiles` référence `auth.users` en `ON DELETE CASCADE`, et toutes les tables utilisateur référencent `profiles` en cascade. La migration `20260927100000` rend `winner_id` (duels, défis) explicite en `ON DELETE SET NULL` : les duels d'un adversaire restent cohérents.
- **Client** : double confirmation dans Réglages, puis déconnexion locale (`signOut({ scope: 'local' })`, la session serveur n'existant plus).
- Les abonnements App Store ne peuvent pas être résiliés par l'app : le message de confirmation le signale.

## Conséquences

- Déploiement requis : la migration et la fonction (`supabase functions deploy delete-account`) — en production uniquement avec l'accord de Battiste.
- Les caches locaux (MMKV / Legend-State) ne sont pas encore purgés à la déconnexion : suivi dans une tâche séparée.

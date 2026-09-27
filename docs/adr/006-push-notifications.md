# ADR 006 — Notifications push

**Date** : 2026-09-27
**Statut** : Décidé

## Contexte

Les rappels locaux (habitudes, série en danger, récap) fonctionnaient, mais les notifications serveur non :

- `getExpoPushTokenAsync()` était appelé sans `projectId` : aucun token en build standalone.
- Le token était stocké dans `profiles.push_token`, table lisible par tous les utilisateurs.
- `send-push-notification` acceptait n'importe quels tokens et textes avec la clé publique : relais de spam.
- La policy d'insert de `notifications` (`with check (true)`) et `create_notification` permettaient d'écrire une notification chez n'importe qui.
- Les notifications in-app n'étaient jamais envoyées en push, et une invitation de duel ne prévenait pas l'adversaire.
- `weekly-reset` ne lisait jamais les tokens (colonne non sélectionnée).

## Décision

1. **Tokens privés** : table `push_tokens` (RLS : lecture de sa propre ligne), écrite uniquement via les RPC `register_push_token` (qui détache le token d'un autre compte sur le même appareil) et `unregister_push_token` (appelée avant la déconnexion). La colonne `profiles.push_token` est supprimée.
2. **Notifications de confiance** : `create_notification` n'accepte que des types connus, des textes bornés, et une cible qui est soi-même ou une personne avec qui on a une relation d'amitié (demande en attente incluse). Le service role reste libre.
3. **Envoi push côté serveur** : un trigger `AFTER INSERT` sur `notifications` appelle l'Edge Function `dispatch-push` via `pg_net`, authentifiée par un secret partagé. Une erreur d'envoi ne bloque jamais la notification in-app. Les tokens `DeviceNotRegistered` sont supprimés.
4. **Invitations de duel** : trigger sur `duels` (statut `pending`) qui crée la notification `duel_invite` pour l'adversaire, côté serveur.
5. `send-push-notification` n'accepte plus que la clé service role.

## Déploiement (en production uniquement avec l'accord de Battiste)

1. `eas init` pour obtenir `extra.eas.projectId` dans `app.json` (nécessaire au token push).
2. Secrets :
   ```sh
   # Secret partagé, par ex. `openssl rand -hex 32`
   supabase secrets set PUSH_DISPATCH_SECRET=<secret>
   ```
   Puis dans le SQL editor :
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<secret>', 'push_dispatch_secret');
   ```
3. `supabase db push` puis `supabase functions deploy dispatch-push --no-verify-jwt` et redéploiement de `daily-streak-alert`, `weekly-reset`, `send-push-notification`.
4. Régénérer les types : `supabase gen types typescript` (mis à jour à la main dans cette PR).

## Conséquences

- Sans les secrets Vault, le trigger ne fait rien : les bases locales/dev continuent de fonctionner.
- Les textes des notifications serveur sont en anglais (comme les notifications existantes créées côté client). Leur traduction selon la langue du destinataire reste à faire.

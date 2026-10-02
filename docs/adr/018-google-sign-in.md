# ADR 018 — Connexion « Continuer avec Google »

**Date** : 2026-10-02
**Statut** : Code prêt ; activation en attente de Battiste (identifiants Google)

## Contexte

Battiste veut que l'on puisse créer son compte par e-mail (déjà possible) et se connecter en un geste avec Google.

## Décision

- **OAuth par le navigateur, via Supabase Auth** (fournisseur `google`), sans SDK Google natif :
  - sur le web, la page part chez Google et revient sur `/auth-callback` ;
  - dans l'app, un navigateur intégré (`expo-web-browser`) s'ouvre et revient sur `habitquest://auth-callback`.
  La session revient dans le fragment du lien (`#access_token=…&refresh_token=…`), comme pour le lien de réinitialisation du mot de passe.
- **Le bouton n'apparaît que si Google est activé** dans le projet Supabase (`/auth/v1/settings`). Le code peut donc partir en production avant la configuration, sans jamais proposer une connexion cassée.
- **Pas encore sur iOS** : la règle 4.8 de l'App Review impose « Se connecter avec Apple » dès qu'une connexion sociale est proposée. Il faut le compte Apple Developer (B5) ; ce sera une tâche à part (`expo-apple-authentication` + `signInWithIdToken`).
- Un compte Google neuf reçoit un pseudo tiré de son e-mail (trigger `handle_new_user`), modifiable ensuite. La langue des e-mails est synchronisée à la première ouverture (`sync-language`).

## À faire par Battiste (activation)

1. Google Cloud Console → « API et services » → **Écran de consentement OAuth** :
   - type externe ;
   - nom HabitQuest ;
   - e-mail de support habitquest.application@gmail.com ;
   - domaine `gethabitquest.com` ;
   - liens vers la politique de confidentialité et les conditions.
2. **Identifiants** → « ID client OAuth » de type *Application Web* :
   - URI de redirection autorisée : `https://aksxyaullvozlkzcegth.supabase.co/auth/v1/callback`.
3. Supabase → Authentication → **Providers → Google** :
   - activer ;
   - coller l'ID client et le secret.
4. Supabase → Authentication → **URL Configuration** → ajouter dans les URL de redirection :
   - `https://habitquest.expo.app/auth-callback` ;
   - `habitquest://auth-callback`.

Claude peut faire les étapes 3 et 4 par l'API de gestion une fois l'ID et le secret dans `.env.deploy.local`.

## Conséquences

- La politique de confidentialité mentionne Google comme fournisseur de connexion.
- iOS : à faire avant la sortie si Google y est voulu, sinon iOS reste en e-mail seulement (ce qui est conforme).

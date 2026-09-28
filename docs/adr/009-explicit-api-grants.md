# ADR 009 — Droits explicites des rôles de l'API

**Date** : 2026-09-28
**Statut** : Décidé

## Contexte

Lors du déploiement en production, l'app ne pouvait lire ni écrire aucune table (`permission denied for table profiles`). Les projets Supabase récents n'accordent plus automatiquement de privilèges aux rôles `anon`, `authenticated` et `service_role` sur le schéma `public` ; la base locale (`supabase start`) le faisait encore, ce qui masquait le problème.

## Décision

La migration `20260928100000_explicit_api_grants.sql` accorde explicitement :
- `service_role` : tout (Edge Functions), y compris sur les futures tables ;
- `authenticated` : lecture de toutes les tables (la RLS filtre les lignes) et écriture uniquement sur les tables modifiées directement par l'app (habitudes, amitiés, défis, duels, objets équipés, succès, `notifications.is_read`, colonnes cosmétiques du profil) ;
- `anon` : aucun accès aux tables (toutes les fonctionnalités exigent une session).

## Conséquences

- Toute nouvelle table doit recevoir ses `grant` dans sa migration (pas de droits par défaut pour `authenticated`).
- Les tests pgTAP passent avec des droits identiques à la production.

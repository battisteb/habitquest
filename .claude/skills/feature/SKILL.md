---
name: feature
description: Implement a HabitQuest feature end-to-end — server (migration, RLS, pgTAP), app (feature module, thin route, FR/EN texts), tests, browser check, PR and deploy. Use for any new feature or significant change to the app.
---

# Implémenter une feature

Feature à implémenter : $ARGUMENTS

Conventions complètes : `CLAUDE.md` (racine du repo). Économie et règles de jeu côté serveur : ADR 008.

## 1. Préparer

- Lire le code lié et les ADR concernés ; vérifier `PLAN.md` (décisions déjà prises, questions ouvertes).
- Décision produit non tranchée (balance, prix, comportement visible) : la poser à Battiste dans `PLAN.md` au lieu de la deviner.
- Créer **son propre worktree** sur une branche dédiée depuis `origin/main` (`feat/…`, `fix/…`), jamais dans celui d'une autre session.

## 2. Serveur (si des données changent)

- Migration `supabase/migrations/AAAAMMJJHHMMSS_description.sql` : RLS sur chaque table, policies minimales, index utiles.
- Toute règle de jeu (XP, or, limites, résultats) se décide côté serveur : fonctions `security definer` qui vérifient l'appelant, triggers de garde pour les écritures des joueurs.
- Tests pgTAP dans `supabase/tests/<domaine>.test.sql`, y compris ce qu'un joueur ne doit **pas** pouvoir faire. Les lancer sur une base neuve : `npx supabase db start` (ports 553xx, applique toutes les migrations) puis `npx supabase test db` ; la CI fait de même.
- Nouvelle table : RLS **et** `grant` explicites pour `authenticated` (rien n'est accordé par défaut, voir la migration `20261001230000_explicit_table_grants`).
- Mettre à jour `src/lib/supabase/types.ts`.

## 3. App

- Code dans `src/features/<domaine>/` (screens, components, hooks, stores, utils) ; la route dans `app/` ne fait que réexporter l'écran.
- Textes dans `src/lib/i18n/index.ts` en **français et anglais** ; aucun texte en dur.
- DA pixel (ADR 011) : `PixelFrame`, `PixelButton`, `PixelInput`, couleurs du thème, pas de formes rondes.
- Pas de `console.log`.

## 4. Vérifier

- Jest + RNTL pour la logique et l'écran ; `npm run typecheck`, `npm run lint` (0 erreur), `npm test`.
- Parcours réel dans le navigateur (Supabase local + build web local) : faire l'action comme un joueur et vérifier le résultat en base.
- Ajouter l'écran à `scripts/smoke-web.js` s'il est nouveau ; smoke FR/EN à 0 problème.

## 5. Livrer

- Commit conventionnel (`feat(scope): …`), PR décrite (avant/après, vérifications), merge.
- Déploiement avec le skill `deploy-prod`.
- Décision technique notable : ADR dans `docs/adr/`. Cocher `PLAN.md`, ligne dans `JOURNAL.md`.

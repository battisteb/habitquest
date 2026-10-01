# HabitQuest — conventions du projet

Habit tracker gamifié (RPG pixel art) : iOS en priorité, puis Android ; version web complète sur https://habitquest.expo.app.
Instructions personnelles et autopilote : `CLAUDE.local.md` (non versionné). Plan et historique : `PLAN.md`, `JOURNAL.md` (non versionnés), `ROADMAP.md` (public).

## Stack

- Expo SDK 55, React Native, expo-router, TypeScript strict
- Supabase : auth, Postgres (RLS partout), fonctions RPC, triggers, Edge Functions (Deno), e-mails via Resend
- Legend-State v3 + MMKV (état et cache local), Reanimated
- RevenueCat (Premium), AdMob (pubs, pas sur le web), expo-notifications

## Architecture

- `app/` : routes expo-router, fichiers fins qui réexportent des écrans de `src/features/`
- `src/features/<domaine>/` : screens, components, hooks, stores, utils, `__tests__/`
- `src/ui/` : design system pixel art (`PixelFrame`, `PixelButton`, `PixelInput`…, thèmes, animations)
- `src/lib/` : client Supabase, i18n (FR/EN), stockage, constantes de jeu
- `supabase/migrations/` (horodatées), `supabase/tests/` (pgTAP), `supabase/functions/`, `supabase/templates/` (e-mails)
- `scripts/` : smoke test web, démo locale, sprites, e-mails d'auth ; `marketing/` : posts et reels (anglais)
- `docs/adr/` : décisions d'architecture ; `docs/review/` : revues et audits

## Règles

- L'économie et les règles de jeu sont décidées par le serveur (ADR 008) : l'app n'écrit jamais XP, or, niveaux ou résultats.
- RLS sur chaque table ; toute fonction `security definer` vérifie l'appelant (ADR 007, 009).
- Textes de l'app en français **et** anglais (`src/lib/i18n`), jamais en dur. Réseaux sociaux : anglais uniquement.
- DA pixel (ADR 011) : pas de formes rondes, composants `Pixel*`, couleurs du thème.
- Tests pour chaque feature : Jest + RNTL côté app, pgTAP côté base. Pas de `console.log`.
- Modification de balance (XP, or, niveaux) : `src/lib/constants/game-config.ts` **et** les fonctions SQL, documentée dans un ADR.

## Git

- Commits conventionnels : `feat(scope): …`, `fix`, `refactor`, `test`, `chore`, `docs`.
- Une feature = une branche = une PR. Jamais de push direct sur `main`, jamais de `--force`.
- Chaque session travaille dans **son propre worktree** ; le Supabase local (Docker) et le compte démo PixelHero sont partagés : prévenir les autres sessions avant de les modifier.

## Workflows (skills dans `.claude/skills/`)

| Skill | Quand |
|---|---|
| `feature` | Nouvelle feature ou changement important, du serveur au déploiement |
| `deploy-prod` | Mise en production (migrations, Edge Functions, e-mails, site) avec sauvegarde et smoke test |
| `release-check` | Avant un build de production ou une soumission aux stores |
| `marketing-en` | Posts et reels en anglais, sans rien publier |
| `support-triage` | Lire et traiter les retours des joueurs (table `support_messages`, boîte du projet) |

## Toujours avec l'accord explicite de Battiste

Soumission aux stores, build EAS de production, publication sur les réseaux, paiement, e-mail à un tiers.

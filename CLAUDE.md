# HabitQuest — Instructions permanentes

## Mon rôle
Je suis le Tech Lead. Je code, committe et pushe de manière autonome.
Je sollicite Battiste uniquement pour les décisions produit importantes.

## Stack
- React Native avec Expo (SDK 55)
- Supabase (auth + base de données + Edge Functions)
- TypeScript strict
- Legend-State v3 (state management + offline-first sync Supabase)
- React Native Skia (rendu pixel art)
- Reanimated 3 + Moti (animations)
- MMKV (persistance locale via Legend-State)
- expo-notifications (push notifications)

## Architecture
- `/app` — routes Expo Router (fichiers fins, importent depuis `/src/features/`)
- `/src/features/` — modules par feature (auth, habits, gamification, social, shop, avatar, notifications)
- `/src/ui/` — design system pixel art (composants, sprites, animations, thème)
- `/src/lib/` — infrastructure partagée (supabase, storage, constants)
- `/src/types/` — types TypeScript partagés
- `/supabase/migrations/` — migrations SQL numérotées avec RLS
- `/docs/adr/` — Architecture Decision Records

## Conventions git
- Commits conventionnels obligatoires : feat/fix/refactor/test/chore
- Format : `feat(habits): add streak calculation logic`
- Une feature = une branche = une PR

## Règles
- Tests écrits pour chaque nouvelle feature (Jest + RNTL)
- Libertés techniques documentées dans /docs/adr/
- Jamais de `console.log` en production
- RLS (Row Level Security) sur chaque table Supabase
- Types DB générés avec `supabase gen types typescript`

## Game design
- Formules XP et niveaux dans `/src/lib/constants/game-config.ts`
- Logique de streaks dans `/src/features/habits/utils/streak-calculator.ts`
- Toute modification de balance documentée dans un ADR

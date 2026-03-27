# ADR-001 : Choix de la stack technique

**Date** : 2026-03-27
**Statut** : Accepte
**Decideur** : Tech Lead (Claude) + PO (Battiste)

## Contexte

HabitQuest est une app mobile de gamification d'habitudes avec une direction artistique pixel art 16-bit. L'app doit supporter l'offline-first, les notifications push, et scaler vers du multi-utilisateurs.

## Decision

| Couche | Choix | Alternative consideree |
|--------|-------|----------------------|
| Framework | Expo SDK 55 (React Native) | Flutter — rejete car ecosysteme Supabase moins mature |
| Routing | Expo Router v5 | React Navigation — rejete car Expo Router est le standard Expo |
| State management | Legend-State v3 (beta) | Zustand — rejete car Legend-State a un plugin Supabase sync integre |
| Backend | Supabase | Firebase — rejete car PostgreSQL est plus flexible pour les queries complexes (leaderboards) |
| Rendu pixel art | React Native Skia | Image components — rejete car pas de controle anti-aliasing |
| Animations | Reanimated 3 + Moti | Animated API — rejete car pas d'execution sur UI thread |
| Persistence locale | MMKV (via Legend-State) | AsyncStorage — rejete car 10x plus lent |
| Tests | Jest + RNTL + Maestro | Detox — rejete car Maestro est plus simple a configurer |
| CI/CD | EAS Build/Update + GitHub Actions | Fastlane — rejete car EAS est integre a Expo |
| Monetisation (V2) | RevenueCat | Direct StoreKit — rejete car RevenueCat simplifie cross-platform |

## Consequences

- Legend-State v3 est en beta : risque de breaking changes. Mitigation : version pinnee, tests extensifs.
- React Native Skia ajoute du poids au bundle (~2MB). Acceptable pour le rendu pixel art.
- Moti depend de Reanimated, pas de dependance supplementaire.

## Notes

- Le choix de Legend-State est le plus impactant : il unifie state management, offline-first, et sync Supabase en une seule lib.
- La direction pixel art necessite Skia pour eviter le flou d'anti-aliasing sur les sprites.

# ADR 021 — Réparer une série cassée sous 48 h

**Date** : 2026-10-03
**Statut** : Décidé (Battiste, idée I2 de l'étude concurrentielle)

## Contexte

Depuis l'ADR 019, une série cassée ne coûte plus rien, mais elle repart à 0 : le joueur perd des semaines d'effort pour un oubli. Les concurrents qui gardent le mieux leurs joueurs proposent une « réparation » (la carte de récupération de Routinery, les conséquences récupérables de KUBBO), qui retire le sentiment que tout est perdu.

## Décision

- Quand une série casse, le serveur la **mémorise pendant 48 h** dans `streaks` : `broken_count`, `broken_at` et `broken_last_day`.
- `repair_streak(habit, with_ad)` la remet, ajoutée aux validations faites depuis, et **couvre les jours manqués** par des gels de source `repair`.
- **Prix** : 3 or par jour de série, entre 15 et 150 or (`streak_repair_cost`, et `STREAK_REPAIR` dans game-config). Cela donne enfin un usage à l'or en dehors de la boutique.
- **Avec une pub récompensée**, pour les joueurs gratuits sur mobile : une fois par jour (`profiles.last_ad_repair_on`). Le serveur ne peut pas vérifier qu'une pub a été vue, d'où la limite quotidienne. Les joueurs Premium n'ont pas de pub et paient en or.
- Dans l'app, le bandeau de série cassée propose « 🔧 RÉPARER · N 💰 », « ▶ RÉPARER (PUB) » et « RECOMMENCER ».

## Conséquences

- Une série réparée ne peut pas l'être une deuxième fois, et après 48 h il est trop tard.
- Il n'y a pas d'abus possible : réparer coûte, et casser une série n'apporte rien.
- Tests : `supabase/tests/streak-repair.test.sql`, `src/features/habits/__tests__/habits-store.test.ts`.

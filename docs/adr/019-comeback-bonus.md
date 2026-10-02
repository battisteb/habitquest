# ADR 019 — Bonus de retour au lieu de la pénalité de série cassée

**Date** : 2026-10-02
**Statut** : Décidé (Battiste, idée I1 de l'étude concurrentielle)

## Contexte

Une série cassée coûtait des XP et de l'or :
- 2 XP par jour de série, 100 XP au maximum ;
- 1 pièce d'or par jour, 50 au maximum.

L'étude concurrentielle (Habitica, Finch, Taskoria, Gamified Lives) arrive à la même conclusion : la punition fait abandonner après un oubli, le fameux « burnout du 60e jour ». Les applications qui gardent leurs joueurs le plus longtemps récompensent le retour au lieu de punir l'absence.

## Décision

- **Plus aucune perte** quand une série casse. La série repart à 0, c'est tout. Le gel automatique (ADR 015) reste le premier filet de sécurité.
- **Fenêtre de retour de 24 h** : quand `process_streak_breaks` casse au moins une série, `profiles.comeback_until` passe à « maintenant + 24 h ».
- Pendant cette fenêtre, **chaque validation rapporte le double d'XP**, et l'or qui va avec (10 % de l'XP), dans `complete_habit`, qui renvoie `comeback: true`.
- L'app affiche « ⚡ RETOUR DU HÉROS : XP ×2 » avec les heures restantes. Le message de série cassée dit « pas de pénalité ».
- Constantes : `COMEBACK` dans `src/lib/constants/game-config.ts` (×2, 24 h), à garder alignées avec le SQL.

## Conséquences

- Il n'y a pas d'abus possible en cassant exprès une série : on perd la série et son multiplicateur, qui vaut plus que 24 h d'XP doublés.
- « Décocher » une quête (`uncomplete_habit`) reprend exactement les XP doublés, puisqu'ils sont enregistrés dans `completions.xp_earned`.
- Tests :
  - `supabase/tests/economy.test.sql` : aucune perte, fenêtre ouverte, XP ×2, retour à la normale après la fenêtre ;
  - `src/features/habits/__tests__/comeback-banner.test.tsx`.

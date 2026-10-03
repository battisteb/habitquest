# ADR 027 — Version mini d'une quête

**Date** : 2026-10-03
**Statut** : Décidé (Battiste ; idée G1 du 2e rapport)

## Contexte

Les jours difficiles, on ne fait souvent rien plutôt qu'un peu, et la série casse. Des applis comme Finch ou Atoms proposent une « petite version » de l'habitude : rester constant compte plus que l'intensité, et une petite action garde l'identité vivante (voir le G3 et l'ADR 019).

## Décision

- Chaque quête peut avoir une **version mini** (`habits.mini`, 60 caractères au plus), par exemple « Lire 1 page » pour « Lire 20 pages ». Elle est facultative et se renseigne à la création ou à la modification.
- Sur l'écran Quêtes, un bouton **🌱 MINI** apparaît à côté de la case des quêtes qui en ont une. Une confirmation explique la règle avant de valider.
- **Valider la mini** :
  - la série continue, et la mini compte pour les missions du jour, le boss et la coop, comme une validation normale ;
  - elle rapporte **la moitié de l'XP**, arrondie, avec au moins 1 XP. L'or suit l'XP : 10 % ;
  - le bonus de retour (×2, ADR 019) s'applique aussi.
- La validation est marquée dans `completions.is_mini`. Une annulation rend exactement l'XP versée.
- Une quête sans version mini ne peut pas être validée en mini (`reason: 'no_mini'`).
- Constantes : `MINI.XP_FACTOR = 0.5` dans `game-config.ts`. SQL : `complete_habit(p_habit_id, p_note, p_mini)`, migration `20261004120000_mini_quests`.

## Conséquences

- **La signature de `complete_habit` change** : les migrations suivantes doivent redéfinir `complete_habit(uuid, text, boolean)`, sinon deux surcharges existeraient. Un test pgTAP vérifie qu'il n'en existe qu'une.
- La moitié de l'XP rend la version complète toujours plus intéressante, tout en évitant le « tout ou rien ».
- Tests :
  - `supabase/tests/mini-quest.test.sql` ;
  - `src/features/habits/__tests__/mini-quest.test.tsx`.

# ADR 028 — Le coffre des missions

**Date** : 2026-10-04
**Statut** : Décidé (Battiste ; idée G7 du 2e rapport)

## Contexte

Une petite récompense surprise motive davantage qu'une récompense fixe (renforcement variable). Elle doit rester saine : pas d'achat, pas de « boîte à butin » payante, et rien qui pousse à valider une quête qu'on n'a pas faite.

## Décision

- Une fois les **trois missions du jour réclamées**, un coffre s'ouvre dans le bandeau des missions. C'est le serveur qui tire et qui paie la récompense (`open_daily_chest`), une fois par jour (`daily_chests`) :
  - 60 % de chances : 20 à 40 or ;
  - 35 % : 25 à 50 XP ;
  - 5 % : un jackpot de 100 or.
- **Jamais payant**, et sans lien avec Premium ou la pub.
- **Pas de triche** : si une mission se rouvre parce qu'une quête a été décochée (sa récompense est alors reprise, voir `20261002230000`), le coffre du jour et sa récompense sont repris aussi (trigger sur `user_daily_quests.is_claimed`).
- Constantes : `CHEST` dans `game-config.ts`. SQL : migration `20261004150000_mission_chest`.

## Conséquences

- En moyenne, environ 23 or et 13 XP de plus par jour complet, soit l'équivalent d'une mission de plus : l'économie reste dans les mêmes ordres de grandeur (ADR 008, 010).
- Tests :
  - `supabase/tests/mission-chest.test.sql` ;
  - `src/features/daily-quests/__tests__/mission-chest.test.ts`.

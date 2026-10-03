# ADR 023 — Humeur du jour et liens personnels

**Date** : 2026-10-03
**Statut** : Décidé (Battiste, idée I4 de l'étude concurrentielle)

## Contexte

L'étude concurrentielle le montre : la gamification attire, mais ce qui fait rester, c'est de comprendre ses propres schémas. Finch croise l'humeur avec les habitudes et en tire des « insights ». Nos stats montraient la régularité, sans rien expliquer.

## Décision

- **Humeur du jour en un geste** sur l'écran Quêtes : 5 visages, de 1 (mauvaise journée) à 5 (excellente). Un vote par jour local, modifiable dans la journée.
- Table `mood_logs (user_id, day, mood)` :
  - RLS en lecture pour soi seul ;
  - écriture uniquement par `log_mood`, qui prend le jour local et vérifie l'appelant.
- **Liens personnels** dans Stats (« 💜 Ce qui te fait du bien »), calculés sur l'appareil à partir des 120 derniers jours (`moodInsights`). Pour chaque quête, on compare :
  - l'humeur moyenne des jours où elle est faite ;
  - celle des jours où elle était prévue mais pas faite (les jours de repos d'une quête à jours choisis ne comptent pas).

  Un lien n'est montré qu'avec au moins 4 jours de chaque côté et un écart d'au moins 0,5 point. Les liens sont classés du plus fort au plus faible.
- **Premium** : un joueur gratuit voit le lien le plus fort, Premium voit les 5 premiers (« 🔒 N autres liens avec Premium »).
- La politique de confidentialité mentionne l'humeur : facultative, privée, jamais partagée.

## Conséquences

- C'est une corrélation, pas une cause : les phrases restent prudentes (« les jours où tu fais X, ton humeur est meilleure »).
- La suppression du compte efface les humeurs (`on delete cascade`).
- Tests : `supabase/tests/mood.test.sql`, `src/features/mood/__tests__/`.

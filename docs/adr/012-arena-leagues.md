# ADR 012 — Arènes (ligues)

**Date** : 2026-09-29
**Statut** : Décidé (choix de Battiste, Q13 et Q14)

## Contexte

Les duels entre amis ne concernent que les joueurs qui ont des amis dans l'app. Battiste veut un mode compétitif pour tout le monde : chaque jour, on affronte un joueur de sa ligue, et le résultat fait monter ou descendre dans les ligues. Les duels entre amis ne changent pas.

## Décisions de game design (Battiste)

- **6 ligues** : Bronze, Argent, Or, Platine, Diamant, Maître. Tout le monde commence en Bronze.
- **Saison de 10 jours**, identique pour tous (la saison 0 commence le lundi 2026-09-28).
- **Groupes de 11 joueurs** : sur une saison, chacun affronte chacun des 10 autres.
- **Attaque / défense** : 11 joueurs ne peuvent pas tous se battre deux à deux chaque jour, donc chaque jour **on attaque un adversaire** et on se défend automatiquement contre un autre. Seul l'attaquant marque des points.
- **Combat = habitudes du jour + stats du héros** : faire ses habitudes le jour même compte le plus, mais la régularité (série) et le niveau pèsent aussi.
- **Une défaite ne fait rien perdre.**
- **Bots** pour compléter les groupes au lancement, clairement signalés dans l'app.

## Règles techniques

**Calendrier.** Le jour `d` (0 à 9) de la saison, le joueur de la place `s` attaque la place `(s + d + 1) mod 11`. Sur 10 jours, chaque place attaque chacune des 10 autres une fois, et chaque joueur est attaqué une fois par jour.

**Résolution.** Un combat est résolu par le serveur une fois que la journée est finie pour les deux joueurs (dans leur fuseau horaire), avec ce qu'ils ont réellement fait ce jour-là. Pas de tâche planifiée : les combats dus sont résolus à la volée par `arena_state()`, qui est idempotente.

**Formule** (`arena_attack_power`, `arena_defense_power`, reprise dans `ARENA` de `game-config.ts`) :

| | Attaque | Défense |
|---|---|---|
| Base | 100 | 100 |
| Par habitude validée ce jour-là (5 max) | +30 | +15 |
| Par niveau | +2 | +2 |
| Par jour de série (meilleure série en cours, 30 max) | +3 | +3 |

L'attaque est multipliée par un facteur de chance de 0,85 à 1,15, tiré de façon déterministe (le même combat donne toujours le même résultat). Victoire si l'attaque dépasse la défense.

**Points et récompenses.**
- Victoire : 3 points et 10 or.
- Défaite avec au moins une habitude faite ce jour-là : 1 point d'effort.
- Défaite sans habitude : 0 point. Rien n'est jamais perdu.

**Fin de saison.** À la première ouverture de l'arène dans la nouvelle saison, l'ancienne est soldée : **les 3 premiers montent**, **les 3 derniers descendent** (pas au-dessus de Maître ni en dessous de Bronze). Classement : points, puis victoires, puis ancienneté de la place. L'app affiche le résultat une fois (`arena_ack_result`).

**Groupes et bots.** Un joueur rejoint le plus ancien groupe de sa ligue qui a encore de la place, sinon un nouveau groupe est créé. Les places libres sont des bots : nom fixe, niveau et série selon la ligue, 0 à 3 habitudes par jour en Bronze et Argent, jusqu'à 4 à partir de l'Or et 5 en Maître. Un joueur qui arrive en cours de saison prend la place d'un bot à partir de ce jour-là ; il joue les jours restants.

**Sécurité.** Les tables `arena_*` ne sont pas lisibles par les clients (RLS sans policy). Tout passe par `arena_state()` et `arena_ack_result()` (security definer). La résolution et le classement ne sont pas appelables par les clients.

## Équilibrage

Simulation (800 saisons par cas, joueur au niveau et à la série typiques de sa ligue, contre 10 bots) :

| Habitudes par jour | Montée | Descente |
|---|---|---|
| 0 | 0 % | ~100 % |
| 1 | ~10 % | ~45 % |
| 2 | 72 à 89 % | ~0 % |
| 3 | ~100 % | 0 % |

Faire 2 ou 3 habitudes par jour suffit pour monter d'une ligue par saison ; ne rien faire fait descendre. Les résultats sont similaires dans toutes les ligues, car les bots deviennent plus assidus en montant.

## Limites connues

- Le niveau et la série utilisés sont ceux du moment de la résolution, pas ceux du jour du combat (écart de quelques points au plus).
- Un joueur qui ne rouvre pas l'arène n'est soldé qu'à son retour ; sa place reste occupée dans son groupe jusqu'à la fin de la saison.
- Pas de récompense de fin de saison en or pour l'instant : la montée de ligue est la récompense.

## Tests

`supabase/tests/arena.test.sql` (pgTAP, 23 assertions) : formules, calendrier, 110 combats par saison, victoire contre un bot, jours sans habitude, idempotence, montée de ligue, bots signalés, groupes partagés, accès direct refusé. `src/lib/constants/__tests__/arena-config.test.ts` vérifie que la copie côté app donne les mêmes valeurs.

## Déploiement

Migration `20260930100000_arena_leagues.sql`. Pas de fonction Edge. L'écran de l'arène arrive dans une PR séparée.

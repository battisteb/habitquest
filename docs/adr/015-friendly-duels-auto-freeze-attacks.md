# ADR 015 — Duels amicaux, gel automatique, attaques par catégorie et par niveau

**Date** : 2026-10-02
**Statut** : Décidé (Battiste, après le test complet de l'app)

## Contexte

Depuis l'arène (ADR 012), chaque joueur a un combat classé par jour. Les duels entre amis, limités à 3 par semaine et récompensés en or et en XP, faisaient doublon. Le gel de série devait être activé à l'avance, alors qu'il sert à couvrir un oubli. Enfin, les attaques ne correspondaient pas aux catégories réelles des quêtes et le niveau du héros ne débloquait rien.

## Décisions

### Duels entre amis = combat amical (PR #93)

- Illimités, sans délai entre deux duels, **sans or ni XP** (plus rien à « farmer »). `claim_duel_reward` est supprimée.
- Seulement entre amis acceptés, 20 par jour au maximum (anti-spam : chaque résultat notifie l'ami).
- L'or et le classement se jouent dans l'arène.

### Gel automatique, pour tout le monde (cette PR)

- Quand une série casserait, `process_streak_breaks` couvre les jours manqués avec les gels disponibles : d'abord le gel gratuit de la semaine du jour manqué, puis les jetons.
- Si tout l'écart ne peut pas être couvert, rien n'est dépensé et la série casse comme avant (une longue absence ne vide pas les jetons).
- Les gels automatiques sont marqués `auto` ; l'app prévient le joueur (« Série sauvée ! »).
- Le bouton « Repos » reste pour poser un jour de repos à l'avance. Premium garde 3 jetons au lieu d'1.

### Attaques (PR #95)

- Une attaque par catégorie réelle (quête validée 7 fois) : santé, sport, apprentissage, bien-être, productivité, nutrition, sommeil, social, créativité, finances, plus l'attaque générale toujours disponible.
- Une attaque par rang, apprise avec le niveau : 3, 5, 7, 9, 11.
- +1 dégât par rang atteint sur toutes les attaques.
- L'adversaire n'utilise que les attaques de son niveau.

## Conséquences

- Moins d'or et d'XP en circulation (plus de récompense de duel) : l'arène, les défis et les quêtes restent les sources.
- Une seule règle de gel, comprise sans explication : on ne perd plus sa série pour un oubli tant qu'on a un gel.
- Tests : `supabase/tests/duels.test.sql`, `economy.test.sql` (duels amicaux, gel automatique), `src/features/duels/__tests__/attacks.test.ts`.

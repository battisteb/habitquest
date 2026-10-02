# ADR 020 — Déblocage progressif des fonctionnalités, annoncé par Pip

**Date** : 2026-10-02
**Statut** : accepté (idée I6 de l'étude concurrentielle, validée par Battiste)

## Contexte

Un nouveau joueur découvrait tout en même temps : quêtes, missions, arène, duels, défis en équipe, boutique. Les concurrents qui retiennent le mieux leurs joueurs ouvrent leurs fonctionnalités par étapes. Chaque étape donne alors un objectif et une petite récompense de progression.

## Décision

- **L'arène s'ouvre au niveau 3**, les **duels entre amis** et les **défis en équipe au niveau 5**. Les quêtes, les missions, la boutique, les amis et les classements restent ouverts dès le départ.
- **Le serveur fait respecter ces seuils** (ADR 008). `unlock_level(feature)` donne le seuil d'une fonctionnalité, et `feature_unlocked(joueur, feature)` vérifie le niveau du profil. Ces fonctions sont utilisées par :
  - `arena_state`, qui renvoie `{ locked, unlock_level }` sans inscrire le joueur dans un groupe ;
  - `create_coop_challenge` ;
  - le garde des duels (`guard_duel_writes`, à la création).

  Le miroir côté app est `UNLOCKS` dans `game-config.ts`. Il faut changer les deux ensemble.
- **Dans l'app** : les entrées verrouillées affichent 🔒 et le niveau requis. L'écran Arène montre Pip qui explique quand elle s'ouvre.
- **Pip annonce chaque ouverture** (« NOUVEAU ! L'arène est ouverte ! ») quelques secondes après la célébration de niveau, avec un bouton pour y aller. Le dernier niveau vu est gardé par joueur : un premier lancement ou une mise à jour de l'app n'annonce rien d'ancien.

## Conséquences

- Les joueurs déjà au-dessus des seuils ne voient aucun changement.
- Les tests pgTAP qui créent des joueurs pour l'arène, les duels ou le co-op leur donnent l'XP du niveau requis.
- Les entraînements contre le sparring-partner restent accessibles à tous : ils ne créent rien côté serveur.
- Migration `20261003210000_progressive_unlocks.sql`, tests `progressive-unlocks.test.sql` et `unlocks.test.tsx`.

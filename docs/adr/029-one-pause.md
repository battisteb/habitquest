# ADR 029 — Une seule Pause

**Date** : 2026-10-04
**Statut** : Décidé (Battiste, allègement D3)

## Contexte

Il existait quatre façons de faire une pause :
- le bouton « Repos » dans l'en-tête d'Aujourd'hui ;
- les modes Focus (examens, compétition, vacances) ;
- la fenêtre « prendre une pause » proposée en cas de surmenage ;
- la pause d'une quête.

Pour un joueur, c'était trop. Et les modes Focus n'existaient que sur le téléphone : le serveur ne les connaissait pas, donc la promesse « séries protégées » n'était pas garantie. Même la pause d'une quête cassait la série à la reprise (corrigé par la migration `20261004160000`).

## Décision

- **Un seul écran Pause** (Réglages → Pause, bandeau d'Aujourd'hui, bandeau de surmenage), avec trois choix :
  - **Juste aujourd'hui** : un gel couvre la journée (`activate_streak_freeze`) ; un joueur gratuit sans gel peut en gagner un avec une pub ;
  - **Certaines quêtes** : pause côté serveur (`habits.is_paused`), aussi longtemps qu'il faut. Les anciens modes deviennent des raccourcis de sélection (📚 Examens, 🏆 Compétition) ;
  - **Tout** : toutes les quêtes en pause (vacances, maladie), puis « Tout reprendre ».
- Toute pause est donc **côté serveur** : `process_streak_breaks` ignore les quêtes en pause, et la reprise garde la série.
- Le bouton Repos de l'en-tête, les modes Focus (stockage local) et la fenêtre de surmenage sont retirés. Aujourd'hui affiche « ⏸ N quêtes en pause · séries protégées → GÉRER ».
- Les missions d'une catégorie dont toutes les quêtes sont en pause sont marquées en pause.
- La pause d'une quête depuis sa page reste disponible : c'est le même mécanisme.

## Conséquences

- Un mode Focus actif au moment de la mise à jour disparaît : ses catégories réapparaissent. Il suffit de les remettre en pause depuis l'écran Pause.
- Tests :
  - `src/features/habits/__tests__/pause.test.tsx` ;
  - `supabase/tests/pause-streak.test.sql`.

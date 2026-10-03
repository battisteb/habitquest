# ADR 025 — Un Social plus léger : fin des défis 1 contre 1

**Date** : 2026-10-03
**Statut** : Décidé (Battiste, allègement D1 et D2)

## Contexte

Quatre systèmes sociaux et compétitifs se chevauchaient : duels, défis 1 contre 1 avec mise en or, défis coop et arène, et des guildes étaient prévues en plus. L'écran Social comptait 5 onglets. Pour un nouveau joueur, c'était trop, et la mise en or entre amis ressemblait à un pari, avec un perdant.

## Décision

- **Les défis 1 contre 1 sont retirés de l'app** : écran de création, onglet, store et textes.
  - Les duels (pour le fun) et la coop (ensemble) couvrent le jeu entre amis ; l'arène couvre la compétition, même sans amis.
  - Les données et fonctions côté serveur (`challenges`, progression dans `complete_habit`) restent pour l'historique ; un nettoyage pourra suivre.
- **Social passe à 2 onglets** :
  - **Amis**, qui s'ouvre par défaut : recherche en haut, demandes, liste avec le niveau et la meilleure série de chacun, bouton ⚔️ pour lancer un duel avec cet ami (dès le niveau 5) ;
  - **Classement** : amis par défaut, global en option.
- L'arène, les duels et la coop sont accessibles directement en haut de l'écran.
- Les futures guildes (G9) seront une évolution de la coop, pas un 5e système.

## Conséquences

- Moins d'écrans à maintenir et à traduire (39 textes de moins par langue).
- Le bouton « Défier » d'un profil ouvre maintenant un duel, avec l'ami présélectionné.
- Tests : `src/features/social/__tests__/social-screen.test.tsx`.

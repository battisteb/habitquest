# ADR 017 — Les objets de la boutique améliorent les stats de combat

**Date** : 2026-10-02
**Statut** : accepté (demande R19 de Battiste)

## Contexte

Les objets de la boutique (chapeaux, tenues, accessoires, fonds, thèmes) étaient purement esthétiques. Battiste veut qu'ils comptent en combat, par exemple un bouclier en bois qui donne de la défense ou des PV, sans casser l'équilibre : la régularité des habitudes doit rester ce qui fait gagner.

Deux systèmes de combat coexistent :
- les **duels entre amis**, simulés dans l'app (`combat-engine.ts`, 100 PV, l'écart de niveau vaut jusqu'à +40 % de dégâts) ;
- les **arènes**, résolues par le serveur (`arena_attack_power` et `arena_defense_power` : 100 de base, plus jusqu'à 150 pour les habitudes du jour, plus 2 par niveau, plus 3 par jour de série).

## Décision

- Chaque objet équipé donne des **points selon sa rareté** (commun 1, peu commun 2, rare 3, épique 4, légendaire 5) à **une stat selon son emplacement** :
  - accessoire → attaque ⚔️ ;
  - chapeau → défense 🛡️ ;
  - tenue → PV ❤️.

  Les fonds et les thèmes restent esthétiques.
- **Duels** : +3 % de dégâts par point d'attaque, −3 % de dégâts subis par point de défense, +4 PV par point de PV. Avec le meilleur équipement (5 / 5 / 5), cela donne +15 % de dégâts, −15 % de dégâts subis et 120 PV, moins que l'avantage de niveau.
- **Arènes** (serveur) : +4 de puissance d'attaque par point d'attaque, +2 de puissance de défense par point de défense ou de PV. Le maximum est de +20 sur chaque puissance, alors qu'un joueur régulier est autour de 250 à 350.
- Le calcul serveur est dans `gear_stats`, `arena_gear_attack` et `arena_gear_defense` (réservées au serveur). Le miroir côté app est `GEAR` dans `game-config.ts`. Il faut changer les deux ensemble.
- La carte de chaque objet en boutique affiche son bonus (« ⚔️ +3 ATQ »).

Les prix, l'XP et l'or ne changent pas.

## Conséquences

- L'or gagné par la régularité a une utilité en combat, en plus de l'apparence.
- Les bots d'arène n'ont pas d'équipement : un joueur bien équipé gagne un peu plus souvent contre eux. L'effet est limité à +20 de puissance.
- Les objets Premium (épiques et légendaires) donnent un petit avantage. Il reste plafonné et ne remplace pas les habitudes du jour : une seule habitude faite vaut +30 d'attaque en arène.
- Migration `20261002220000_gear_stats.sql`, tests pgTAP `gear-stats.test.sql`, tests Jest `gear-config.test.ts`.

## Amendement du 2026-10-02 : pas de « payer pour gagner » (I3)

Battiste a validé, après son étude des concurrents, que le Premium doit rester esthétique et confort, sans avantage de puissance payant.

- Les objets épiques et légendaires sont réservés au Premium. Leur bonus de combat est donc **plafonné au niveau rare (3 points)**. Ils restent plus beaux, pas plus forts.
- Le meilleur équipement possible donne 3 / 3 / 3 points au lieu de 5 / 5 / 5 :
  - en duel : +9 % de dégâts, −9 % de dégâts subis et 112 PV ;
  - en arène : au plus +12 d'attaque et +12 de défense.
- Tout ce qui donne de la puissance s'achète avec l'or gagné par la régularité (objets communs à rares).
- Migration `20261003200000_gear_cap.sql` (`gear_points`) et `GEAR.RARITY_POINTS` dans `game-config.ts`.

Point ouvert : le souffle du dragon compagnon (R20, Premium) donne 3 à 10 dégâts une fois par duel. C'est le dernier avantage de combat payant ; à confirmer avec Battiste (le garder, le plafonner ou le rendre purement visuel).

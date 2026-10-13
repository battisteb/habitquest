# ADR 032 — Les sets d'équipement par catégorie

**Date** : 2026-10-14
**Statut** : accepté. L'idée vient de Battiste (« donner du stuff en fonction de la catégorie »). Il a validé le style le 14/10 à partir du set Sport.

## Contexte

Le héros s'équipait seulement avec de l'or, à la boutique. Rien ne montrait **quelles** habitudes le joueur tient. Les paliers d'identité (7, 21 et 66 jours, ADR 019 et G3 : « tu deviens quelqu'un qui… ») existaient déjà, mais ils ne laissaient aucune trace visible sur le héros.

## Décision

- **Un set de trois pièces par catégorie d'habitude**, gagné au palier d'identité d'une habitude de la catégorie. C'est la meilleure série (`longest_count`) qui compte : une série cassée ne reprend rien.

  | Palier | Emplacement | Sport | Apprentissage | Bien-être | Santé |
  |---|---|---|---|---|---|
  | 7 jours | chapeau (posé sur les cheveux) | bandeau | toque d'érudit | fleur de lotus | couronne de feuilles |
  | 21 jours | objet tenu | haltère | tome du savoir | chapelet | gourde |
  | 66 jours | tenue | débardeur de champion | toge d'érudit | robe de moine | tunique de soigneur |

- **Jamais vendues** : ce sont des `shop_items` avec `is_available = false` et deux nouvelles colonnes, `unlock_category` et `unlock_streak`. `purchase_item` les refuse déjà, comme la Couronne des saisons.
- **Serveur** (ADR 008) : un trigger `grant_category_gear` sur `streaks`, après insertion ou mise à jour de `longest_count`.
  - Il ajoute les pièces atteintes dans `purchases`.
  - Il envoie une notification `gear_unlocked` par pièce, dans la langue du joueur (fr, en, ja, ko, zh).
  - Les joueurs qui avaient déjà atteint un palier ont reçu leurs pièces à la migration, sans notification.
- **App** :
  - Les sprites sont dans `sprites.ts`. Les objets tenus ont le poing du héros sur la poignée, comme l'épée.
  - La boutique montre aussi les pièces à gagner, avec un cadenas et « 21 jours d'affilée sur une quête Sport ». Elle n'affiche ni prix ni badge Premium pour ces pièces. Un appui explique comment les gagner.
  - Textes en 5 langues (`content.ts` et `i18n`).
- Les tenues de 66 jours sont de rareté « épique » pour la couleur et le bonus d'équipement. Elles restent accessibles aux joueurs gratuits, car elles se gagnent.

## Conséquences

- Le héros raconte les habitudes du joueur. C'est aussi un sujet de reels (« mon héros = ma vie »).
- Les autres catégories (Nutrition, Sommeil, Social, Créativité, Finance, Productivité) suivront avec le même mécanisme : il suffit d'ajouter des lignes `shop_items` et des sprites.
- Les pièces gagnées comptent comme des achats pour les succès « Acheter 1 / 5 objets », comme la Couronne des saisons.
- Migration `20261014120000_category_gear.sql`, tests `category-gear.test.sql` (11), `set-piece.test.ts`, `hat-sprites.test.ts` : un chapeau est centré sur sa ligne la plus large, et un nœud ou un gland peut pendre d'un côté.

# ADR 024 — Arcs saisonniers et runes

**Date** : 2026-10-03
**Statut** : Décidé (Battiste ; idée G6, qui remplace les « chapitres mensuels » du 2e rapport)

## Contexte

L'engagement envers les applis gamifiées retombe après 2 à 6 mois. Les « dates repères » (nouvelle saison, nouvelle année) relancent la motivation (*fresh start effect*). Sur les réseaux, la tendance « Winter Arc » (se transformer d'octobre à décembre) est très forte, et des « Spring / Summer arcs » existent aussi. Au Japon, les éditions saisonnières (季節限定) sont très populaires.

## Décision

- **4 arcs par an**, calés sur les tendances plutôt que sur les saisons astronomiques :
  - Winter Arc : octobre à décembre ;
  - Spring Arc : janvier à mars (bonnes résolutions) ;
  - Summer Arc : avril à juin ;
  - Autumn Arc : juillet à septembre (rentrée).

  Mêmes noms partout, car c'est le terme des réseaux, y compris dans l'hémisphère Sud.
- Un arc compte les **semaines dont le jeudi tombe dedans** (règle ISO : 13 ou 14 semaines, et chaque semaine appartient à un seul arc).
- **Bonne semaine** : au moins 70 % des validations prévues par les quêtes. Un jour gelé compte comme fait. On reste dans l'esprit des ADR 015 et 019 (pas besoin d'être parfait).
- Une semaine passée est **figée** dans `arc_weeks` la première fois qu'elle est vue : changer ses quêtes ne réécrit pas le passé.
- **8 bonnes semaines** = la rune de la saison (`user_runes`), +100 XP et +50 or.
- **Les 4 runes différentes**, gagnées sur une ou plusieurs années, donnent :
  - 1 semaine de Premium à un joueur gratuit (statut Premium côté serveur, expiration à 7 jours) ;
  - 500 or à un joueur déjà Premium.

  Une seule fois (`profiles.four_seasons_rewarded_at`).
- **Cosmétiques saisonniers** (G6b, migration `20261004140000_seasonal_cosmetics`) :
  - chaque arc vend sa cape pour 300 or, pendant l'arc seulement (`shop_items.season`, contrôlé par `purchase_item` avec `arc_of` dans le fuseau du joueur) : cape de givre, cape fleurie, cape solaire, cape des moissons ;
  - la couronne des saisons (quatre gemmes, une par saison) est offerte avec la récompense des 4 runes, et n'est jamais vendue.
  - Une cape achetée reste à vie ; elle revient en vente au même arc l'année suivante.
- Dans l'app :
  - une ligne compacte au-dessus du boss de la semaine, sur l'écran Quêtes ;
  - un écran Arc : grille des semaines, rune, règles, collection des 4 runes, carte à partager (#winterarc) ;
  - Pip annonce chaque nouvel arc une fois et fête la rune.
- Constantes : `ARC` dans `game-config.ts` ; SQL : `arc_state_for` / `get_arc_state` (migration `20261003140000_seasonal_arcs`).

## Conséquences

- Quatre campagnes marketing par an, la première pendant la tendance « Winter Arc » actuelle.
- La rune se gagne à la lecture (`get_arc_state`) : un joueur qui ne rouvre pas l'app la reçoit à son retour, tant que ses semaines comptent.
- Tests : `supabase/tests/arcs.test.sql`, `src/features/arc/__tests__/arc.test.tsx`.

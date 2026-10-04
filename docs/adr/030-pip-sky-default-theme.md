# ADR 030 — Ciel de Pip, le thème par défaut

**Date** : 2026-10-04
**Statut** : Décidé (Battiste, après les maquettes « Crépuscule, Lagon, Ciel de Pip, Aube pastel »)

## Contexte

Le thème gratuit était le « Donjon obscur » : fond presque noir. Battiste voulait une app plus inspirante et moins sombre, proche de la DA de Pip (qui est aussi devenu le logo), en restant pixel rétro. Sur les quatre maquettes, il a choisi « Ciel de Pip » pour l'app et le site, et a gardé le sombre et « Aube pastel » comme thèmes à acheter.

## Décision

- **Ciel de Pip** devient le thème gratuit : ciel clair `#CFE8FF`, cartes blanches cerclées d'un contour sombre (`#2B3A6B`), bleu de Pip pour les actions. Il garde la clé `default` : `profiles.active_theme`, le garde serveur (`guard_profile_writes`) et `FREE_THEME` ne changent pas. Tous les joueurs passent donc au nouveau thème sans migration de profil.
- L'ancien thème par défaut devient **Donjon obscur** (`dungeon`, 50 or, commun, niveau 1). **Aube pastel** (`dawn`, 120 or, peu commun, niveau 3) est ajouté. Les deux sont des articles de la Boutique (migration `20261004190000_theme_pip_sky`).
- Les joueurs qui avaient déjà un compte reçoivent le Donjon obscur : c'était leur thème, ils le gardent.
- Les thèmes clairs (Ciel de Pip, Aube pastel, Lifestyle) éclaircissent ce que les thèmes sombres foncent : `isLightTheme()` (tokens) et `mix()` (pixel-frame) pour la bulle de Pip, les quêtes validées, la barre d'onglets et la barre d'état. Derrière le héros, chaque thème a sa scène (ciel et nuages, lever de soleil pastel).
- Le site public passe aux mêmes couleurs (`docs/assets/site.css`), avec une couleur d'encre bleue pour les mots en valeur, le jaune restant pour les boutons. Splash et couleurs web d'`app.json` : `#CFE8FF`. L'icône garde son fond bleu nuit.

## Conséquences

- Les captures (site, reels, stores) sont refaites avec Ciel de Pip.
- Un nouveau thème clair n'a rien à faire de plus : `isLightTheme()` se calcule sur sa couleur de fond.
- Les prix des deux thèmes sont un choix par défaut, à ajuster si Battiste le souhaite.

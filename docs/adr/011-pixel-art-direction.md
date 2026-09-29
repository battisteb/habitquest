# ADR 011 — Direction artistique « pixel assumé »

**Date** : 2026-09-29
**Statut** : Décidé (maquette validée par Battiste : https://claude.ai/artifact/QG4vfdKwsU2ARCxY6xkRR8)

## Constat

L'app faisait « application de base » : police système partout, rectangles plats avec une bordure fine. Arrondir les coins l'aurait rendue générique. On pousse donc le pixel art au lieu de l'adoucir.

## Décisions

1. **Police pixel pour tous les textes en gras** (titres, étiquettes, chiffres, boutons) ; le texte courant reste en police système pour la lisibilité.
   - Choix : **Jersey 10** (`@expo-google-fonts/jersey-10`). La maquette utilisait Pixelify Sans, mais dans l'app, aux petites tailles, elle confondait des lettres (« B » lu « G », « C » lu « O », « 5 » lu « S »). Jersey 10 reste net de 10 à 24 px, garde les minuscules et les accents, et est compact (« AUJOURD'HUI » tient dans l'en-tête).
   - Jersey 10 dessine plus petit que la police système : les tailles passent par `pixelSize()` (×1,3) dans `tokens.ts`.
   - `fontFamily` remplace `fontWeight` (Android ignore les graisses sur une police personnalisée). La police est chargée dans `app/_layout.tsx` ; en cas d'échec l'app démarre avec la police système.
2. **Coins taillés + ombre dure** : `PixelFrame` (`src/ui/components/pixel-frame.tsx`) dessine une bordure dont les coins sont laissés vides (effet boîte de dialogue rétro) et un rebord plus sombre dessous. Appuyé, le cadre descend d'un pixel et le rebord disparaît ; la hauteur totale ne change pas (pas de saut dans les listes).
   - Utilisé par : boutons (`PixelButton`), cartes d'habitude (cadre vert une fois validée), missions du jour (cadre et bandeau dorés), bouton « Réclamer », barres de progression, cartes du profil, bulle du héros.
   - Ailleurs, les arrondis ≤ 8 px sont passés à 0 et `borderRadius` vaut 0 ; les cercles (avatars, pastilles) sont conservés.
3. **Barres de progression en segments** (`PixelProgress`) : jauge de jeu plutôt que curseur web.
4. **Le héros sur l'écran du jour** (`HeroGreeting`) : l'avatar du joueur commente la journée dans une bulle (« Encore 2 quêtes et on passe niveau 6 ! »). Le calcul (`hero-line.ts`) compte le minimum de quêtes à valider pour monter de niveau, les plus grosses récompenses d'abord.
5. **Onglets** : l'onglet actif devient un bloc plein de la couleur d'action, comme une entrée de menu sélectionnée.

La palette ne change pas.

## Conséquences

- Les nouveaux écrans doivent utiliser `fonts.bold` + `pixelSize()` pour les textes en gras et `PixelFrame` pour les éléments mis en avant.
- Les reels et captures marketing sont à régénérer avec la nouvelle DA.

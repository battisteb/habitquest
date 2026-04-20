# ADR 003 — Système d'avatar pixel art

**Date** : 2026-04-01
**Statut** : Décidé

## Contexte

L'identité visuelle de HabitQuest repose sur l'esthétique pixel art. L'avatar doit être personnalisable, léger (pas d'assets PNG), et s'afficher parfaitement sur tous les écrans.

## Options évaluées

1. **PNG sprites** — nécessite un artiste, assets volumineux, difficile à personnaliser dynamiquement
2. **React Native Skia** — GPU-accelerated, support pixel-perfect, mais API plus complexe
3. **React Native Views pures** — CSS-equivalent, cross-platform, zéro dépendance native pour le rendu

## Décision

**Grille de pixels 16×16 rendue avec React Native Views** (option 3).

Chaque "pixel" est une `View` absolument positionnée, `width = height = SCALE * 4px`. L'avatar est défini comme un tableau de coordonnées `[x, y, color_key]`.

### Structure
- `BODY_PIXELS` — corps de base (tête, yeux, bouche, corps, jambes, chaussures)
- `HAIR_PIXELS` — coiffure affichée quand aucun chapeau équipé
- `HAT_SPRITES` — dict par `sprite_key` (9 chapeaux)
- `ACCESSORY_SPRITES` — dict par `sprite_key` (6 accessoires)
- `OUTFIT_COLORS` — dict par `sprite_key` (9 tenues)
- `BG_COLORS` — dict par `sprite_key` (9 backgrounds)

### Personnalisation couleurs
- Teinte de peau, couleur de cheveux, couleur des yeux : palettes de swatches dans l'onboarding et le profil
- Stockage : MMKV local (offline-first) + sync Supabase (`skin_color`, `hair_color`, `eye_color` dans `profiles`)

## Conséquences

- Pas de dépendance à des assets PNG → l'avatar est généré programmatiquement
- Facile d'ajouter de nouveaux cosmétiques : ajouter une entrée dans le dictionnaire correspondant
- Performance acceptable pour une taille ≤ 220px (max ~120 Views par avatar) ; au-delà, envisager Skia
- Les cosmétiques en boutique sont liés à des `sprite_key` cohérents entre `SHOP_ITEMS` et les dictionnaires du renderer

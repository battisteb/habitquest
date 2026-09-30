# Sprites du héros (32×32)

Sources des dessins du héros et des objets de la boutique. Chaque sprite est une grille
de 32 lignes de 32 caractères (`.` = transparent), résolue par la palette de son calque
dans `src/features/avatar/renderer/pixel-avatar.tsx`.

- `base.py` : corps, cheveux, tunique par défaut (moitié gauche, symétrisée) ;
- `hats.py`, `outfits.py`, `accessories.py` : objets de la boutique ;
- `go_*.py` : planches d'aperçu PNG (`pip install pillow`) ;
- `gen_ts.py` : génère `src/features/avatar/renderer/sprites.ts` (ne pas modifier ce fichier à la main).

```sh
cd scripts/sprites
python go_hats.py        # aperçu hats.png
python gen_ts.py ../../src/features/avatar/renderer/sprites.ts
```

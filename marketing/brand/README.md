# Marque : Pip

Pip est la mascotte **et le logo** de HabitQuest : le guide du tutoriel, l'humeur du jour sur l'écran Quêtes, l'icône de l'app, du site et des e-mails (décisions de Battiste, 2026-10-04). L'ancien logo à l'épée est abandonné.

Règle générale : la marque, c'est toujours Pip ; on n'ajuste que sa couleur et son expression.

- **Logo** (app, site, stores, e-mails, comptes anglais TikTok et YouTube) : Pip **bleu et souriant** (`joy` + `worried`).
- **Compte Instagram japonais** : Pip **rose et souriant** (`joy` + `love`).

| Fichier | Usage |
|---|---|
| `pip-avatar-blue.png` | Photo de profil des comptes anglais (1080×1080) : l'icône de l'app |
| `pip-avatar-sakura.png` | Photo de profil (1080×1080) : Pip rose et souriant sur fond sakura |
| `pip-avatar-sakura-round.png` | Aperçu rond, tel qu'il apparaît sur Instagram et TikTok |
| `pip/pip-<expression>-<humeur>.png` | Pip seul, fond transparent (512×512), pour les posts et les reels |

- Expressions : `happy`, `joy` (le sourire), `proud`, `worried`, `sad`, `sleepy`.
- Couleurs (humeurs) : `calm` (vert), `love` (rose), `party` (jaune), `fire` (orange), `worried` (bleu), `rest` (violet).

Les images sont générées à partir des sprites de l'app (`src/features/mascot/sprites.ts` : `pipSprite`, `PIP_MOODS`). Si Pip change dans l'app, il faut les régénérer.

L'icône de l'app et toutes ses tailles (`assets/`, `public/`, `docs/assets/icon.png`, `marketing/assets/icon.png`) et `pip-avatar-blue.png` sortent de `python scripts/make-icon.py`, qui lit aussi `sprites.ts`. L'aperçu du site pour les réseaux (`docs/assets/og-image.png`) : `node scripts/site/render-og.js`.

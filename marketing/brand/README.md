# Marque : Pip

Pip est la mascotte de HabitQuest : le guide du tutoriel, et sur l'écran Quêtes il porte l'humeur du jour. C'est aussi la photo de profil du compte japonais (décision de Battiste, 2026-10-04).

| Fichier | Usage |
|---|---|
| `pip-avatar-sakura.png` | Photo de profil (1080×1080) : Pip rose et souriant sur fond sakura |
| `pip-avatar-sakura-round.png` | Aperçu rond, tel qu'il apparaît sur Instagram et TikTok |
| `pip/pip-<expression>-<humeur>.png` | Pip seul, fond transparent (512×512), pour les posts et les reels |

- Expressions : `happy`, `joy` (le sourire), `proud`, `worried`, `sad`, `sleepy`.
- Couleurs (humeurs) : `calm` (vert), `love` (rose), `party` (jaune), `fire` (orange), `worried` (bleu), `rest` (violet).

Les images sont générées à partir des sprites de l'app (`src/features/mascot/sprites.ts` : `pipSprite`, `PIP_MOODS`). Si Pip change dans l'app, il faut les régénérer.

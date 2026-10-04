# Kit marketing HabitQuest

| Fichier | Contenu |
|---|---|
| `strategy.md` | Positionnement, comptes et bios, piliers, rythme, calendrier des 4 premières semaines, hashtags, mesure |
| `reels.md` | Scripts des 8 reels (plans, textes, légendes) |
| `posts.md` | Textes des 5 carrousels et légendes |
| `posts.json` / `reels.json` | Contenu des visuels et vidéos générés |
| `templates/` | Gabarits HTML (slide 1080×1350, reel 1080×1920) |
| `assets/` | Icône et captures de l'app (FR, format téléphone) |
| `brand/` | Pip : photo de profil et images pour les posts et les reels |

## Régénérer les visuels

Prérequis : Chrome installé, Node, et `npm i --no-save puppeteer-core ffmpeg-static`.

```sh
node marketing/render-posts.js            # → marketing/exports/posts/<carrousel>/<n>.png
REC_DIR=<dossier des .webm> node marketing/build-reels.js   # → marketing/exports/reels/<reel>.mp4
```

Les enregistrements d'écran (`today.webm`, `profile.webm`, `battle.webm`) sont faits sur la version web de l'app avec le compte de démo. Pour changer un texte, modifie `posts.json` ou `reels.json`, puis relance la commande. `marketing/exports/` n'est pas versionné.

## Publier

1. Créer `@habitquest.app` sur Instagram et TikTok (compte pro/créateur), bio de `strategy.md`. Photo de profil : `brand/pip-avatar-sakura.png` (Pip ; compte japonais), sinon `assets/icon.png`.
2. Reels : importer le MP4, ajouter la légende de `reels.md`. Sur TikTok, ajouter un son tendance à faible volume.
3. Carrousels : importer les PNG dans l'ordre, légende de `posts.md`.

# Kit marketing HabitQuest

| Fichier | Contenu |
|---|---|
| `strategy.md` | Positionnement, comptes et bios, piliers, rythme, calendrier des 4 premières semaines, hashtags, mesure |
| `reels.md` | Scripts des 8 reels (plans, textes, légendes) |
| `posts.md` | Textes des 5 carrousels et légendes |
| `posts.json` / `reels.json` | Contenu des visuels et vidéos générés |
| `templates/` | Gabarits HTML (slide 1080×1350, reel 1080×1920) |
| `assets/` | Icône et captures de l'app (FR, format téléphone) |

## Régénérer les visuels

Prérequis : Chrome installé, Node, et `npm i --no-save puppeteer-core ffmpeg-static`.

```sh
node marketing/render-posts.js            # → marketing/exports/posts/<carrousel>/<n>.png
REC_DIR=<dossier des .webm> node marketing/build-reels.js   # → marketing/exports/reels/<reel>.mp4
```

Les enregistrements d'écran (`today.webm`, `profile.webm`, `battle.webm`) sont faits sur la version web de l'app avec le compte de démo. Pour changer un texte, modifie `posts.json` ou `reels.json`, puis relance la commande. `marketing/exports/` n'est pas versionné.

## Style des reels (dynamique, par défaut)

Tout suit la musique : chaque scène dure un nombre entier de temps et chaque transition un temps (0,40-0,47 s), donc chaque changement de scène tombe sur un temps. Le flip 3D entre les écrans de l'app et la transition en petits pixels entre les titres sont conservés ; aucun zoom dans les écrans, aucune coupe franche, aucun tremblement.

- **Effets** : fond pixel en parallaxe (grille et étoiles qui dérivent d'une scène à l'autre), lueur des bords et du téléphone sur chaque temps, mots qui « poppent » un par un (croche) avec dépassement, confettis pixel sur les mots en surbrillance et sur le CTA, héros qui saute sur le temps avec compteur de niveau et barre d'XP.
- **Stickers** (`fx` d'un segment, position `x`/`y` en px ou `sx`/`sy` dans l'écran de l'app, moment `at` en s ou `beat` en temps, `life`, `sfx`) : `xp` (pastille qui monte, `text`, `icon: coin|fire`, `color`), `arrow` (`dir`, `label`, rebondit sur le temps), `pip` (la mascotte, `expr`, `mood`, `say`), `counter` (`from`, `to`, `dur`, `icon`), `bar` (`from`, `to`, `w`, `label`), `burst` (confettis).
- **Musique** : un morceau original est écrit pour chaque reel (`marketing/audio/chiptune.py reel`, Python + numpy) : grosse caisse sur chaque temps, basse en octaves, arpèges, refrain syncopé, montée et drop sur `music.drop` (segment 1 par défaut), roulement de caisse claire avant chaque scène, changement de tonalité sur `music.lift`, coup final sur le CTA (`ctaBeat` temps après le début du dernier segment). Thèmes : `quest` (140 BPM), `epic` (150), `chill` (128). Mix normalisé à -14 LUFS.
- `style: "smooth"` (fondus lents) et `punchy: true` (ancien style avec zooms) restent disponibles par reel.

## Publier

1. Créer `@habitquest.app` sur Instagram et TikTok (compte pro/créateur), photo de profil `assets/icon.png`, bio de `strategy.md`.
2. Reels : importer le MP4, ajouter la légende de `reels.md`. Sur TikTok, ajouter un son tendance à faible volume.
3. Carrousels : importer les PNG dans l'ordre, légende de `posts.md`.

---
name: marketing-en
description: Produce or update HabitQuest social media content in English — Instagram carousels, TikTok/Instagram/YouTube reels, captions and bios — from real recordings of the app. Use when marketing assets must be created or refreshed after an app change. Never publishes anything.
---

# Produire le marketing (anglais uniquement)

Décisions de Battiste :
- Réseaux sociaux **en anglais uniquement** (2026-10-01) : plus de versions françaises.
- **Rien n'est publié** par Claude : ni post, ni reel, ni planification Buffer, sans accord explicite.

Comptes : Instagram @habitquest.app, TikTok habitquest.application, YouTube @habitquest.application. Stratégie et planning : `marketing/strategy.md`, `marketing/launch-sprint.md`.

## Carrousels (posts)

- Textes : `marketing/posts.en.json` ; légendes, hashtags et bios : `marketing/posts.md` (sections EN).
- Captures : `marketing/assets/screens-en/` (app en anglais, 390×844 @2x, compte démo PixelHero).
- Rendu : `LANG=en node marketing/render-posts.js` → `marketing/exports/posts-en/` (ignoré par git).

## Reels

- Script de chaque reel : `marketing/reels.en.json` ; légendes : `marketing/reels.en.md`.
- Montage : `LANG=en REC_DIR=<clips .webm en anglais> node marketing/build-reels.js [reel]` → `marketing/exports/reels-en/` (+ `sans-musique/` pour ajouter un son tendance dans l'app).
- Dépendances : `npm i --no-save puppeteer-core ffmpeg-static`.

## Enregistrer l'app en anglais

1. Supabase local + build web local (`expo export --platform web --clear` avec `.env.development.local`) servi sur le port 8090.
2. Compte démo **PixelHero** (`scripts/demo/reset-local-demo.sql` pour le remettre à jour). Pendant le tournage, renommer ses quêtes en anglais, puis les remettre en français à la fin.
3. Navigateur à 390×844, `localStorage` `habitquest-storage:app_language` = `en`, tutoriel marqué comme vu.
4. Le Supabase local est **partagé** entre sessions : prévenir les autres sessions (`ListAgents` / `SendMessage`) avant de modifier PixelHero ou de redémarrer les conteneurs.

## Contrôle avant livraison

- Regarder chaque export (planche d'images extraites avec ffmpeg) : héros actuel, aucun texte français, aucun écran d'erreur ou de chargement, chiffres cités exacts (nombre de succès, de rangs…).
- Les exports restent hors git ; copier les fichiers finaux dans `<repo principal>/marketing/exports/` pour Battiste et lui dire où les regarder.

---
name: release-check
description: Pre-submission checklist for the App Store and Google Play — config, versions, permissions, privacy, store listing, builds and a full quality pass on HabitQuest. Use before any TestFlight / production build or store submission, and to report what still blocks a release.
---

# Vérifier avant une soumission aux stores

Rien ne part (build EAS de production, TestFlight, soumission, test fermé Google) sans **accord explicite de Battiste**. Cette checklist produit un rapport : ce qui est prêt, ce qui bloque, qui doit agir.

Références : `docs/app-store/ios-release-checklist.md`, `docs/app-store/review-and-privacy.md`, `docs/app-store/metadata*.md`, `docs/play-store/android-release-checklist.md`, ADR 004.

## 1. Qualité (doit être vert)

- `npm run typecheck`, `npm run lint` (0 erreur), `npm test`.
- Tests pgTAP : chaque fichier de `supabase/tests/` sur le Supabase local, 0 `not ok`.
- `npx expo-doctor` : aucun problème bloquant.
- `npm run check:bundle` : les bundles iOS, Android et web se construisent.
- `scripts/smoke-web.js` en FR et EN : 0 problème sur tous les écrans.

## 2. Configuration de l'app

- `app.json` : `version`, `ios.buildNumber` / `android.versionCode` (gérés par EAS si `autoIncrement`), `bundleIdentifier` / `package`, nom, icône, splash, `scheme`.
- Permissions : seulement celles utilisées, chaque texte d'usage iOS (`NS…UsageDescription`) en clair ; ATT si pubs personnalisées.
- `ios.privacyManifests` à jour avec les SDK présents (AdMob, RevenueCat, expo-*).
- `eas.json` : profils `production` iOS/Android, `submit` (Apple ID, ASC App ID, Team ID ; compte de service Google). Champs encore vides = bloquant, à lister.
- Variables de prod : clés RevenueCat iOS/Android, IDs AdMob réels (pas les IDs de test), URL et clé anon Supabase de prod.

## 3. Conformité

- Suppression de compte dans l'app (exigence Apple) : fonctionne en prod.
- Politique de confidentialité publiée et liée dans l'app et la fiche.
- Achats : restauration des achats présente, prix et conditions affichés sur le paywall.
- Contenu généré par les joueurs (pseudos, messages support) : signalement possible via Support.
- Compte de démo pour la review Apple (identifiants dans les notes de review, jamais dans le repo).

## 4. Fiche store

- Textes FR/EN (`docs/app-store/metadata*.md`) à jour avec les fonctionnalités réelles.
- Captures aux bonnes tailles (iPhone 6,7" et 6,5" ; Android téléphone), avec la DA actuelle.
- Questionnaire de confidentialité (App Privacy / Data safety) cohérent avec ce que l'app collecte.

## 5. Rapport

Écrire le résultat dans `docs/review/` (ou mettre à jour le rapport d'audit) : une ligne par point, statut ✅ / ❌ / ⏳, et pour chaque ❌ qui doit agir (Claude ou Battiste). Les actions de Battiste vont dans `PLAN.md` en `- [B]`, les questions dans « Questions en attente ».

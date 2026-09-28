# Checklist de release iOS

✅ = fait dans le repo · ⏳ = à faire par Battiste (compte / console) · ❌ = bloquant à développer

## Configuration de l'app
- ✅ Bundle ID `com.battiste.habitquest`, version `1.0.0`, build number géré par EAS (`appVersionSource: remote`)
- ✅ Icône 1024×1024 RGB sans transparence (`assets/icon.png`)
- ✅ iPhone uniquement (`supportsTablet: false`)
- ✅ `ITSAppUsesNonExemptEncryption: false`
- ✅ Privacy manifest (`ios.privacyManifests`)
- ✅ Prompt App Tracking Transparency avant les pubs personnalisées

## Comptes et identifiants
- ⏳ Apple Developer Program actif (99 $/an)
- ⏳ App créée dans App Store Connect → renseigner `appleId`, `ascAppId`, `appleTeamId` dans `eas.json` (`submit.production.ios`)
- ⏳ App iOS enregistrée dans AdMob → iOS App ID (dans `app.json`, plugin `react-native-google-mobile-ads`) + blocs bannière, interstitiel et interstitiel avec récompense (dans `src/features/monetization/utils/ad-service.ts`)
- ⏳ RevenueCat : clé API iOS de production (`appl_…`) à la place de la clé `test_…` dans `subscription-store.ts`, produits IAP créés dans App Store Connect
- ⏳ Variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` configurées comme variables d'environnement EAS

## Exigences App Review
- ✅ Suppression de compte depuis l'app (règle 5.1.1(v)) — PR #4 ; ⏳ déployer la migration et la fonction `delete-account` en prod
- ✅ Politique de confidentialité complétée ; ⏳ activer GitHub Pages (main, dossier `/docs`) → `https://battisteb.github.io/habitquest/privacy-policy`
- ⏳ Fiche « App Privacy » : réponses prêtes dans `review-and-privacy.md`
- ⏳ Compte de démo pour l'équipe de revue ; notes de revue prêtes dans `review-and-privacy.md`
- ⏳ Classification d'âge : réponses proposées dans `review-and-privacy.md` (9+ attendu, la fiche actuelle indique 4+)

## Métadonnées (`docs/app-store/metadata.md`)
- ✅ Nom, sous-titre, description, mots-clés, catégories — anglais (`metadata.md`) et français (`metadata.fr.md`)
- ✅ URL de support : `https://battisteb.github.io/habitquest/support`
- ⏳ Captures d'écran iPhone 6,9" (1320×2868) — au moins 3

## Build et envoi (avec l'accord de Battiste uniquement)
```sh
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

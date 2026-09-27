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
- ❌ Suppression de compte depuis l'app (règle 5.1.1(v)) — obligatoire dès qu'on peut créer un compte
- ❌ Politique de confidentialité publiée à une URL publique (l'URL de `metadata.md` renvoie une 404)
- ⏳ Fiche « App Privacy » (données collectées : e-mail, identifiant, données d'usage, identifiant publicitaire)
- ⏳ Compte de démo pour l'équipe de revue (e-mail + mot de passe dans App Store Connect)
- ⏳ Classification d'âge : vérifier le questionnaire (fonctions sociales / duels)

## Métadonnées (`docs/app-store/metadata.md`)
- ✅ Nom, sous-titre, description, mots-clés, catégories
- ✅ URL de support : `https://github.com/battisteb/habitquest`
- ⏳ Captures d'écran iPhone 6,9" (1320×2868) — au moins 3

## Build et envoi (avec l'accord de Battiste uniquement)
```sh
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

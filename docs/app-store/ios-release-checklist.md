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
- ✅ Apple Developer Program actif (08/10/2026, compte individuel, Team ID HYGF39C97D)
- ✅ App créée dans App Store Connect (ASC App ID 6820433050, bundle com.battiste.habitquest enregistré avec Push + In-App Purchase) ; `ascAppId` et `appleTeamId` dans `eas.json`. L'Apple ID n'est pas versionné : `eas submit` le demande, ou variable `EXPO_APPLE_ID`
- ⏳ App iOS enregistrée dans AdMob → iOS App ID (dans `app.json`, plugin `react-native-google-mobile-ads`) + blocs bannière, interstitiel et interstitiel avec récompense (dans `src/features/monetization/utils/ad-service.ts`)
- ⏳ RevenueCat : clé API iOS de production (`appl_…`) à la place de la clé `test_…` dans `subscription-store.ts`, produits IAP créés dans App Store Connect
- ⏳ Offre « à vie » (I10) : dans App Store Connect, créer un achat intégré **non consommable** `habitquest_premium_lifetime` (49,99 $ ; abonnements 3,99 $ / mois et 24,99 $ / an avec essai gratuit de 14 jours sur l'annuel ; prix locaux par pays, validés par Battiste le 07/10/2026). Dans RevenueCat, l'attacher à l'entitlement `premium` et l'ajouter à l'offering par défaut comme package « Lifetime ». Le webhook le traite comme Premium sans date de fin ; la fin d'un ancien abonnement ne l'annule pas
- ⏳ Essai gratuit de 14 jours : dans App Store Connect, sur chaque abonnement (mensuel et annuel), « Offre de lancement » → « Essai gratuit » de 2 semaines, tous pays. L'app le détecte seule (`introPrice` à 0 + éligibilité RevenueCat) et l'affiche après le tutoriel ; sans offre configurée, elle montre le Premium normal
- ⏳ Variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` configurées comme variables d'environnement EAS

## Exigences App Review
- ⏳ Connexion Google cachée sur iOS tant que « Se connecter avec Apple » n'existe pas (règle 4.8, ADR 018) : à ajouter avant d'activer Google sur iOS
- ✅ Suppression de compte depuis l'app (règle 5.1.1(v)) — PR #4 ; ⏳ déployer la migration et la fonction `delete-account` en prod
- ✅ Politique de confidentialité complétée ; ⏳ activer GitHub Pages (main, dossier `/docs`) → `https://gethabitquest.com/privacy-policy`
- ⏳ Fiche « App Privacy » : réponses prêtes dans `review-and-privacy.md`
- ⏳ Compte de démo pour l'équipe de revue ; notes de revue prêtes dans `review-and-privacy.md`
- ⏳ Classification d'âge : réponses proposées dans `review-and-privacy.md` (9+ attendu, la fiche actuelle indique 4+)

## Métadonnées (`docs/app-store/metadata.md`)
- ✅ Nom, sous-titre, description, mots-clés, catégories — anglais (`metadata.md`) et français (`metadata.fr.md`)
- ✅ URL de support : `https://gethabitquest.com/support`
- ⏳ Captures d'écran iPhone 6,9" (1320×2868) — au moins 3

## Build et envoi (avec l'accord de Battiste uniquement)
```sh
eas build --platform ios --profile production
eas submit --platform ios --profile production
```

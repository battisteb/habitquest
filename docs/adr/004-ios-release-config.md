# ADR 004 — Configuration de release iOS

**Date** : 2026-09-27
**Statut** : Décidé

## Contexte

Préparation du premier build TestFlight. L'audit de `app.json` / `eas.json` a relevé :

- `NSUserTrackingUsageDescription` déclaré, mais le prompt App Tracking Transparency (ATT) n'est jamais affiché, alors que les pubs AdMob étaient demandées en mode personnalisé → risque de rejet (règle 5.1.2).
- Les IDs AdMob iOS (app et blocs d'annonces) sont en fait ceux de l'app Android. AdMob exige une app par plateforme.
- `supportsTablet: true` impose des captures iPad et une revue sur iPad pour une app pensée pour téléphone.
- Pas de privacy manifest ni de déclaration de chiffrement (questions bloquantes à chaque upload).

## Décision

1. **ATT** : ajout de `expo-tracking-transparency`. Le prompt est affiché après la connexion, uniquement si des pubs peuvent être servies. Sans consentement (ou sur refus), seules des pubs non personnalisées sont demandées (`requestNonPersonalizedAdsOnly`). Android n'est pas concerné.
2. **AdMob iOS** : les IDs iOS sont vidés. Tant qu'ils ne sont pas renseignés, `shouldShowAds()` renvoie `false` sur iOS en release : aucune pub plutôt que des blocs Android.
3. **iPhone uniquement** : `supportsTablet: false` (réversible plus tard).
4. **Conformité** : `ITSAppUsesNonExemptEncryption: false` (HTTPS standard uniquement) et `privacyManifests` pour les API « required reason » utilisées par React Native / MMKV (UserDefaults, FileTimestamp, SystemBootTime, DiskSpace).
5. **Versions** : `appVersionSource: "remote"` dans `eas.json` ; EAS gère `buildNumber` / `versionCode` avec `autoIncrement`, sans modifier `app.json`.

## Conséquences

- Il faut enregistrer l'app iOS dans AdMob et renseigner ses IDs dans `ad-service.ts` et `app.json` avant d'avoir des revenus pub sur iOS.
- Le build iOS nécessite un nouveau binaire natif (module ATT).

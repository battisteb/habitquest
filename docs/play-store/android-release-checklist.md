# Checklist de release Android (Google Play)

✅ = fait dans le repo · ⏳ = à faire par Battiste (compte / console)

## Configuration de l'app
- ✅ Package `com.battiste.habitquest`, Android App Bundle (`eas.json` → `production.android.buildType: app-bundle`)
- ✅ `versionCode` incrémenté par EAS (`autoIncrement`, et `appVersionSource: remote` une fois la PR iOS fusionnée)
- ✅ Icône adaptative (premier plan, arrière-plan, monochrome) et icône 1024×1024
- ✅ Permissions minimales : `INTERNET`, `VIBRATE`, `MODIFY_AUDIO_SETTINGS`, notifications et identifiant publicitaire (ajoutés par leurs modules). Micro (`RECORD_AUDIO`), stockage externe et service de lecture en arrière-plan retirés (`expo-audio` n'est utilisé que pour la lecture au premier plan)
- ✅ `google-service-account.json` ignoré par git

## Comptes et identifiants
- ⏳ Compte Google Play Console (25 $, une fois) et fiche de l'app créée
- ⏳ Compte de service Google Cloud avec accès à la Play Console → fichier `google-service-account.json` à la racine (jamais commité)
- ⏳ RevenueCat : clé API Android de production (`goog_…`) à la place de la clé `test_…` dans `subscription-store.ts` ; produits d'abonnement créés dans la Play Console
- ⏳ AdMob : bloc « interstitiel avec récompense » dédié (le code réutilise l'ID de l'interstitiel classique, qui ne servira pas de pubs avec récompense)
- ⏳ Variables `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` configurées comme variables d'environnement EAS

## Exigences Google Play
- ⏳ Politique de confidentialité : `https://gethabitquest.com/privacy-policy` (après activation de GitHub Pages)
- ✅ Suppression de compte dans l'app + lien web : `https://gethabitquest.com/support` (section « Supprimer mon compte »)
- ⏳ Formulaire « Sécurité des données » : réponses ci-dessous
- ⏳ Déclaration « Identifiant publicitaire » : oui, utilisé pour la publicité (AdMob)
- ⏳ Questionnaire de classification du contenu (IARC) : violence cartoon légère (duels pixel art), pas de chat, pas de jeux d'argent
- ⏳ Public cible : 13 ans et plus (l'app contient des publicités et n'est pas conçue pour les enfants)
- ⏳ Nouveau compte développeur personnel : test fermé avec au moins 12 testeurs pendant 14 jours avant l'accès à la production

## Sécurité des données (Data safety)

| Catégorie Google | Collectée | Partagée | Obligatoire | Finalités |
|---|---|---|---|---|
| Informations personnelles → Adresse e-mail | Oui | Non | Oui | Fonctionnalité, gestion du compte |
| Informations personnelles → ID utilisateur | Oui | Non | Oui | Fonctionnalité, gestion du compte |
| Activité dans l'app → Autre contenu généré (habitudes, notes, pseudo) | Oui | Non | Oui | Fonctionnalité |
| Activité dans l'app → Interactions | Oui (AdMob) | Oui | Non | Publicité |
| Informations financières → Historique d'achats | Oui | Non | Non | Fonctionnalité |
| Identifiants de l'appareil → ID publicitaire | Oui | Oui | Non | Publicité |
| Infos sur l'appli et performances → Plantages / diagnostics | Oui (SDK AdMob) | Oui | Non | Publicité, analyse |

- Données chiffrées en transit : **oui** (HTTPS)
- Possibilité de demander la suppression des données : **oui** (dans l'app + lien web)

## Fiche Play Store
- Titre (30 car.) : `HabitQuest : Habitudes RPG` / `HabitQuest: Habit Tracker RPG`
- Description courte (80 car.) : reprendre le texte promotionnel de `docs/app-store/metadata.fr.md` / `metadata.md`
- Description longue : reprendre la description App Store
- ⏳ Captures téléphone (au moins 2, 1080×1920 ou plus) et image de présentation 1024×500

## Build et envoi (avec l'accord de Battiste uniquement)
```sh
eas build --platform android --profile production
eas submit --platform android --profile production   # piste "internal" (eas.json)
```

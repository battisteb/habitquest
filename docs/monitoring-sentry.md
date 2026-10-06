# Monitoring des erreurs — Sentry

Sentry est **intégré mais inactif par défaut**. Il ne s'allume que si la variable
`EXPO_PUBLIC_SENTRY_DSN` est définie. Sans elle, le SDK ne s'initialise pas :
rien n'est envoyé, aucun impact sur l'app. (Et même avec un DSN, rien n'est
envoyé en développement : `enabled: !__DEV__`.)

Code : `src/lib/monitoring/sentry.ts` (init gardée), appelé dans `app/_layout.tsx`
(`initSentry()` + `wrapRoot(RootLayout)`). RGPD : `sendDefaultPii: false` — on ne
collecte que la stack trace et le contexte technique.

## Étape 1 — Activer (capture des erreurs & crashs)

1. Crée un compte sur https://sentry.io (gratuit) et un projet **React Native**.
2. Copie le **DSN** du projet (Settings → Client Keys (DSN)).
3. Mets le DSN dans l'environnement de build, **sans guillemets**, sous le nom :
   ```
   EXPO_PUBLIC_SENTRY_DSN=https://xxxxxxxx@oXXXX.ingest.sentry.io/XXXX
   ```
   - **Web** (`npm run deploy:web`) : ajoute-la à l'environnement de déploiement
     (là où sont déjà les autres `EXPO_PUBLIC_*`).
   - **Builds EAS** (iOS/Android) : `eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>`
     (ou via le dashboard EAS). Les `EXPO_PUBLIC_*` sont injectées au build.
4. Rebuild / redéploie. À partir de là, erreurs JS et crashs natifs remontent
   dans Sentry.

Le DSN est une clé **publiable** (prévue pour vivre côté client), ce n'est pas
un secret — mais garde-la hors du dépôt (variable d'environnement).

## Étape 2 — (optionnel) Stack traces lisibles (source maps)

Par défaut les stacks sont minifiées. Pour les rendre lisibles, Sentry doit
recevoir les **source maps** au build, via le plugin Expo :

1. Ajoute à `app.json` → `expo.plugins` :
   ```json
   ["@sentry/react-native/expo", { "organization": "<org>", "project": "<project>" }]
   ```
2. Crée un **auth token** Sentry (Settings → Auth Tokens, scope `project:releases`)
   et expose-le **au build uniquement** (jamais dans le bundle) :
   ```
   SENTRY_AUTH_TOKEN=<token>
   ```
   - EAS : `eas env:create --name SENTRY_AUTH_TOKEN --value <token> --visibility secret`
   - Web : variable d'environnement de la commande de build.
3. Rebuild : les source maps sont envoyées automatiquement à chaque release.

> ⚠️ Vérifie un **build EAS de test** après l'étape 2 avant de t'appuyer dessus :
> le plugin touche au prebuild natif, impossible à tester côté dev web.

## Vérifier que ça marche

Une fois le DSN en place, déclenche une erreur de test depuis un écran de debug :

```ts
import { Sentry } from '../src/lib/monitoring/sentry';
Sentry.captureException(new Error('Sentry test ⚔️'));
```

L'événement doit apparaître dans le dashboard Sentry en quelques secondes.

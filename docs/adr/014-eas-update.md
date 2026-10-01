# ADR 014 — Mises à jour à distance (EAS Update)

**Date** : 2026-10-01
**Statut** : Décidé (Battiste, question Q18)

## Contexte

Une fois l'app sur les stores, chaque correctif passe par un nouveau build et une revue Apple/Google (de quelques heures à quelques jours). Un bug bloquant le jour de la sortie resterait donc en ligne trop longtemps. Les canaux `preview` et `production` existaient déjà dans `eas.json`, mais sans `expo-updates` ils n'avaient aucun effet.

## Décision

- `expo-updates` est installé ; `app.json` pointe vers le service EAS Update du projet (`updates.url`).
- **`runtimeVersion` suit la version de l'app** (`policy: appVersion`) : une mise à jour publiée pour la 1.0.0 n'atteint que les builds 1.0.0. Tout changement natif impose une nouvelle version et un nouveau build.
- Chaque profil de build écoute son canal : `preview` (builds internes) et `production` (stores).
- L'app vérifie s'il existe une mise à jour au lancement et l'applique au lancement suivant (comportement par défaut, rien ne bloque le joueur).
- Le web n'est pas concerné : il se déploie toujours avec `npm run deploy:web`.

## Ce qu'on peut envoyer à distance

| Oui (code JavaScript et ressources) | Non (nouveau build obligatoire) |
|---|---|
| Correctifs de bugs dans l'app | Ajout, retrait ou mise à jour d'un module natif |
| Textes et traductions | Permissions, `app.json` natif (icône, splash, plugins) |
| Écrans, styles, sons, images | Changement de version du SDK Expo |
| Nouvelles fonctionnalités qui n'utilisent que du JavaScript, dans le cadre de l'app validée | Tout ce qui change la nature de l'app (règle Apple 3.3.2) |

Une mise à jour qui dépend d'un changement de la base est publiée **après** la migration, et la migration doit rester compatible avec la version précédente de l'app (des joueurs n'auront pas encore la mise à jour).

## Procédure

1. Fusionner la PR (CI verte).
2. `npm run update:preview -- --message "…"`, puis vérifier sur un build `preview`.
3. `npm run update:production -- --message "…"` ; ligne dans `JOURNAL.md`.
4. En cas de problème : republier la mise à jour précédente (`npx eas-cli update:republish --group <id>`), ou `eas update:rollback`.

Publier en production suit les mêmes règles qu'un déploiement : Claude peut le faire seul pour un correctif, après la CI et une vérification sur `preview` (skill `deploy-prod`).

## Coût

Gratuit dans l'offre de base d'EAS (1 000 utilisateurs actifs par mois pour les mises à jour) ; à revoir avec la croissance.

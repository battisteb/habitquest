# Plan d'urgence — lancement

Une page pour réagir vite le jour J et les semaines suivantes. Qui fait quoi :
**Claude** diagnostique, corrige et déploie (avec sauvegarde) ; **Battiste** décide de tout ce
qui touche aux stores, aux paiements et aux messages aux joueurs.

## Où regarder en premier

| Signal | Où | Seuil d'alerte |
|---|---|---|
| Crashs, erreurs JS | Sentry, avec une alerte par mail : Alerts → Create Alert → Issues → « A new issue is created », envoi à habitquest.application@gmail.com | une erreur nouvelle qui touche plus de 5 joueurs en 1 h |
| Base, auth, fonctions | Supabase → projet `aksxyaullvozlkzcegth` (Paris) → Reports | CPU > 80 %, erreurs 5xx, base > 400 Mo |
| Site et web app | `node scripts/smoke-web.js https://habitquest.expo.app` | un seul écran en erreur |
| Achats | RevenueCat → Overview / Customers ; App Store Connect, Play Console | un achat payé sans Premium actif |
| Avis des joueurs | Réglages → Support (`support_messages`), boîte habitquest.application@gmail.com, avis des stores | 2 plaintes sur le même sujet |

## Scénarios

### 1. L'app plante ou un écran est cassé
1. Lire l'erreur dans Sentry (version, écran, appareil).
2. Si un correctif JavaScript suffit : branche `fix/…`, tests, PR, merge sur OK de Battiste,
   puis **mise à jour à distance** (`npm run update:production`, skill `deploy-prod`, ADR 014).
   Les joueurs l'ont au prochain lancement, sans passer par les stores.
3. Si la dernière mise à jour est en cause : **retour arrière immédiat** vers la précédente :
   `npx eas-cli update:republish --group <id du groupe précédent>` (les groupes sont listés
   par `npx eas-cli update:list --branch production`).
4. Si c'est natif (crash au démarrage avant le JS) : nouveau build + revue Apple/Google. Prévenir
   les joueurs (réseaux, message dans l'app au besoin) et prioriser la revue accélérée Apple
   (« Request an expedited review »).

### 2. Supabase sature ou ne répond plus
1. Vérifier la page de statut Supabase et les Reports du projet.
2. Pic de trafic : passer le projet au plan supérieur (Battiste, paiement) ; c'est immédiat.
3. Requête lente : Supabase → Query Performance, ajouter l'index manquant par migration
   (sauvegarde `db dump` d'abord, comme toujours).
4. Panne Supabase : l'app garde ses données en local (MMKV, Legend-State) et resynchronise au
   retour ; prévenir sur les réseaux, ne rien toucher à la base.

### 3. Un paiement échoue ou Premium ne s'active pas
1. RevenueCat → Customers → chercher le joueur (ID de l'app) : achat reçu ? entitlement actif ?
2. Achat reçu mais Premium inactif : vérifier le webhook `revenuecat-webhook` (logs de la
   fonction Supabase) et le rejouer depuis RevenueCat ; en dernier recours, accorder Premium
   à la main (accord de Battiste) et répondre au joueur.
3. Achat refusé par le store : rien côté app ; renvoyer vers le support Apple/Google.
4. Remboursements : uniquement par Apple/Google, jamais par nous.

### 4. Les e-mails ne partent pas
Mots de passe oubliés via Resend (SMTP de Supabase Auth, 30/h). Si le quota bloque : relever la
limite dans Supabase Auth ou passer Resend au plan supérieur (Battiste). L'inscription n'envoie
pas d'e-mail (confirmation automatique).

### 5. Un joueur signale un bug ou un contenu
Skill `support-triage` : reproduire, corriger, répondre. Un joueur signalé (pseudo) : le pseudo
est la seule donnée publique ; le renommer côté serveur si besoin, puis répondre.

## Avant chaque mise en production
- Sauvegarde de la base (`supabase db dump`, schéma + données), ligne dans `JOURNAL.md`.
- Smoke test du site après déploiement.
- Pour une mise à jour à distance : vérifier qu'aucun changement natif n'a eu lieu depuis
  les builds installés (sinon nouveau build).

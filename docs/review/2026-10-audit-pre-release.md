# Audit avant les licences Apple et Google — 1ᵉʳ octobre 2026

Demandé par Battiste avant de prendre les comptes Apple Developer et Google Play Console : tout doit être propre, fonctionnel et organisé. Méthode : outils officiels (`expo-doctor`, `npm audit`, advisors sécurité et performance de Supabase), comparaison de la prod avec le repo, lecture de la config, du site public et des documents de conformité, puis correction, fusion et déploiement (sauvegarde prod avant chaque changement de la base).

Gravité : 🔴 sécurité ou confidentialité · 🟠 bloquant pour les stores ou pour la fiabilité · 🟡 organisation et finition.
Statut : ✅ corrigé · ⏳ attend une action ou une décision · ℹ️ accepté, expliqué.

## Constats

| # | Gravité | Domaine | Constat | Correction | Statut |
|---|---|---|---|---|---|
| 1 | 🔴 | Base | Tout joueur connecté lisait le fuseau horaire, la langue, l'abonnement, l'id RevenueCat, les jetons de gel et le dernier duel de **tous** les joueurs | Colonnes publiques seulement ; son propre profil via `get_my_profile()` ; test `privacy.test.sql` | ✅ #72 |
| 2 | 🔴 | Site public | GitHub Pages publiait des documents internes : guide du support (requête SQL qui joint les e-mails), **rapport de revue listant les failles** (corrigées), notes techniques. La « Support URL » prévue pour l'App Store pointait sur le guide interne | Documents internes exclus du site ; vraie page Support publique (EN/FR) | ✅ #78 |
| 3 | 🟠 | Base | Appliquées sur une base neuve, les migrations donnaient un schéma plus permissif que la prod (insertion directe d'achats, tables d'arène lisibles…). La prod n'a jamais été concernée | Droits explicites, copiés de la prod ; une base neuve est maintenant identique | ✅ #74 |
| 4 | 🟠 | CI | ESLint ne pouvait jamais échouer (`\|\| true`) ; les tests de la base ne tournaient pas | Lint bloquant ; job « migrations depuis zéro + 223 tests pgTAP » à chaque PR | ✅ #74 |
| 5 | 🟠 | Conformité | Aucun lien vers la politique de confidentialité ni vers des conditions d'utilisation dans l'app ; pas de conditions d'utilisation (obligatoires pour un abonnement, règle App Store 3.1.2) | Page Conditions d'utilisation (EN/FR) ; liens dans Réglages et sur l'écran Premium | ✅ #78, #79 |
| 6 | 🟠 | Conformité | Politique de confidentialité d'avant le Support : messages au support, langue, Resend et hébergement non déclarés | Politique EN/FR et réponses « App Privacy » mises à jour | ✅ #78 |
| 7 | 🟠 | Config | `app.json` : champs invalides en SDK 55 ; `expo-asset` manquant et en double (`expo-doctor` : 3 erreurs) | Corrigé ; `expo-doctor` 20/20 | ✅ #76 |
| 8 | 🟠 | Config | Le même identifiant AdMob est utilisé pour iOS et Android | Chaque plateforme a son propre identifiant : à créer dans AdMob (B6) | ⏳ Battiste |
| 9 | 🟠 | Config | `eas.json` : Apple ID, ASC App ID et Team ID encore fictifs | À remplir dès la création du compte Apple (B5) | ⏳ Battiste |
| 10 | 🟡 | Base | 39 règles RLS réévaluées à chaque ligne, 12 règles en double, 8 clés étrangères sans index, fonctions de trigger appelables, GraphQL exposé sans être utilisé | Tout corrigé ; il ne reste que des « index inutilisés » (aucun trafic) | ✅ #72 |
| 11 | 🟡 | Sécurité | Mots de passe de 6 caractères acceptés ; pas de blocage des mots de passe fuités | 8 caractères minimum et message clair ; le blocage des mots de passe fuités exige le plan Pro de Supabase | ✅ / ⏳ Q17 |
| 12 | 🟡 | Dépendances | Skia, Moti et expo-image installés mais jamais utilisés (Skia est un gros module natif) | Retirés : builds natifs plus légers | ✅ #76 |
| 13 | 🟡 | Dépendances | 19 alertes `npm audit` | Corrections sans rupture appliquées ; les 14 restantes sont dans les outils de build d'Expo (npm ne propose que de rétrograder Expo au SDK 46) et ne partent pas dans l'app | ✅ / ℹ️ |
| 14 | 🟡 | Organisation | 7 agents Claude d'avril, obsolètes ; conventions seulement dans un fichier privé | 5 skills à jour, `CLAUDE.md` versionné | ✅ #71 |
| 15 | 🟡 | Organisation | 79 branches sur GitHub, dont 74 déjà fusionnées | Supprimées ; restent `main`, une ancienne branche non fusionnée et celles en cours | ✅ |
| 16 | 🟡 | Organisation | README et ROADMAP décrivaient une autre app (Skia, duels « en temps réel », commande `npm run e2e` inexistante) | Réécrits | ✅ #80 |
| 17 | 🟡 | App | Version affichée dans Réglages écrite en dur | Lue dans la config de l'app | ✅ #79 |
| 18 | 🟡 | Tests | Les parcours Maestro (`e2e/flows`) visent des éléments qui n'existent plus et ne tournent nulle part | À refaire sur le premier build de développement (A6) | ⏳ Claude |
| 19 | 🟡 | Config | Les canaux `preview`/`production` de `eas.json` n'ont pas d'effet : `expo-updates` n'est pas installé | Décision Q18 : activer les mises à jour à distance (corrections sans repasser par la revue) | ⏳ Q18 |
| 20 | 🟡 | Organisation | Le dépôt sur le Bureau est resté sur un commit de septembre (les sessions travaillent dans des worktrees) | À mettre à jour quand aucune session n'y travaille | ⏳ Claude |

## Vérifié sans problème

- **Secrets** : aucun secret dans le code ni dans l'historique git ; le site ne contient que la clé publique `anon`.
- **Accès anonyme** : le rôle `anon` n'a aucun droit sur les tables ; les alertes « lisible par anon » des advisors étaient des faux positifs.
- **Fonctions serveur** restantes signalées par l'advisor : ce sont les RPC de l'app, chacune vérifie l'appelant (ADR 007) ; `username_available` est volontairement appelable avant l'inscription.
- **Conformité** : suppression de compte dans l'app, restauration des achats, demande ATT avant les pubs personnalisées, manifeste de confidentialité iOS, pas de pubs sur le web, e-mails d'authentification de marque (testés de bout en bout en prod).
- **Qualité** : TypeScript strict, ESLint 0 erreur, Jest 343/343, pgTAP 223/223 sur base neuve et sur base locale, bundles iOS + Android + web, smoke test des 39 écrans en FR et EN à 0 problème, en local et en prod.

## Checklist « prêt pour les licences »

| Étape | Statut |
|---|---|
| Code, base, CI, site public et documents de conformité | ✅ prêts |
| Compte Apple Developer → `eas.json` (Apple ID, Team ID, ASC App ID) | ⏳ B5 |
| AdMob : app iOS + blocs de pub, identifiants séparés iOS / Android ; clé RevenueCat iOS | ⏳ B6 |
| Compte Google Play Console + compte de service + 12 testeurs | ⏳ B7 |
| Compte de démo pour la revue Apple (habitudes, ami, duel terminé) | ⏳ Claude, dès B5 |
| Captures des stores avec la DA actuelle (6,7" et 6,5" ; Android) | ⏳ Claude |
| Parcours Maestro refaits sur un build de développement | ⏳ Claude, après B5 |
| Plan Supabase Pro au lancement (sauvegardes quotidiennes, mots de passe fuités) | ⏳ Q17 |
| Mises à jour à distance (EAS Update) | ⏳ Q18 |

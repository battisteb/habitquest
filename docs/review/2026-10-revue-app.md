# Revue de l'app — 30 septembre et 1ᵉʳ octobre 2026

Revue complète avant la sortie sur les stores, demandée par Battiste. Pour chaque domaine : lecture du code, parcours réels dans le navigateur (Supabase local, compte démo), tests ajoutés, puis correction, fusion et déploiement en prod. Chaque changement de la base prod a été précédé d'une sauvegarde complète.

## Méthode et outils

- **`scripts/smoke-web.js`** : se connecte puis ouvre les 38 écrans en français et en anglais. Il signale les erreurs JS, les clés de traduction affichées brutes, les débordements à 390 px, les mots coupés sur deux lignes et les écrans bloqués en chargement. Il a été lancé avant chaque déploiement et après chaque mise en prod ; résultat final : 0 problème.
- **`scripts/demo/reset-local-demo.sql`** : remet le compte démo local dans un état récent, avec des séries à jour.
- **Tests** : 311 tests Jest (contre 256 au début) et 202 assertions pgTAP réparties en 14 fichiers (contre 101 au début).

## Constats

Gravité : 🔴 triche ou sécurité · 🟠 bug visible par les joueurs · 🟡 finition.

| # | Gravité | Domaine | Constat | Correction | PR |
|---|---|---|---|---|---|
| 1 | 🔴 | Boutique | On pouvait équiper un objet jamais acheté, même Premium, via l'API | Trigger : l'objet doit être possédé et placé dans l'emplacement de sa catégorie | #42 |
| 2 | 🔴 | Boutique | Les raretés épique et légendaire étaient vendues à tous (l'app les cachait seulement) | `purchase_item` exige Premium | #42 |
| 3 | 🔴 | Quêtes | Une quête « 3 fois par semaine » validable 3 fois le même jour (3× l'XP d'un coup) | Une validation par jour, côté serveur et côté app | #43 |
| 4 | 🔴 | Succès | L'app décidait des succès : n'importe qui pouvait tous se les attribuer, avec l'XP et l'or | RPC `check_achievements()` côté serveur, insertion directe interdite | #44 |
| 5 | 🔴 | Amis | Amitié créée déjà « acceptée » (sans consentement) ; le destinataire pouvait réécrire l'expéditeur | Trigger : toujours « en attente », seul le statut change | #45 |
| 6 | 🔴 | Défis 1v1 | Le perdant pouvait annuler un défi en cours pour garder sa mise | Seuls les défis en attente s'annulent | #45 |
| 7 | 🔴 | Serveur | `weekly-reset` et `daily-streak-alert` (push à tous les joueurs) appelables avec la clé publique : spam possible | Clé serveur exigée, redéployées | #52 |
| 8 | 🔴 | Profil | Nom, couleurs et thème écrits sans contrôle serveur | Mêmes règles que l'app, côté serveur | #53 |
| 9 | 🔴 | Économie | Jeton de gel (pub) plafonné à 3 pour tous, au lieu de 1 pour les joueurs gratuits | Plafond selon l'abonnement | #53 |
| 10 | 🟠 | Boutique | 5 thèmes vendus qui n'existaient pas dans l'app (or dépensé pour rien) | Vente des vrais thèmes, faux thèmes retirés (Q15 b) | #56 |
| 11 | 🟠 | Boutique | Bouclier en bois, Amulette et Épée de flammes : aucun dessin, rien ne s'affichait | Dessinés (héros 32×32) | #49 |
| 12 | 🟠 | Défis 1v1 | La durée (3/7/14 j) n'était jamais appliquée : un défi pouvait durer indéfiniment | Chrono dès l'acceptation, clôture à l'échéance (le plus avancé gagne) | #45 |
| 13 | 🟠 | Succès | « Challenger » et « Vainqueur » se débloquaient avec un simple ami | Ils comptent les défis lancés et gagnés | #44 |
| 14 | 🟠 | Inscription | Un nom de héros déjà pris faisait échouer l'inscription (erreur incompréhensible) | Vérification avant l'inscription + suffixe de secours côté serveur | #47 |
| 15 | 🟠 | Amis | A→B et B→A comptaient l'amitié deux fois | Une demande reçue en retour vaut acceptation ; doublons nettoyés | #45 |
| 16 | 🟠 | Profil d'ami | Héros par défaut au lieu du vrai ; « Ajouter en ami » affiché à un ami ; tuile « 0 complétion » fausse | Vrai héros, statut chargé, tuile retirée | #42 |
| 17 | 🟠 | Défis 1v1 | L'expéditeur voyait « Accepter » sur son propre défi | Il voit « En attente… / Annuler » | #45 |
| 18 | 🟠 | Premium | Sur le web, le bouton d'achat ne faisait rien | Message « s'achète dans l'app » ; erreur d'achat expliquée sur mobile | #52 |
| 19 | 🟠 | Duels | Emoji dans un cercle au lieu des héros | Héros 32×32 en cadres pixel | #55 |
| 20 | 🟡 | Quêtes | « MODIFIE/R », « ARCHIVE/R » coupés en deux | Boutons réorganisés | #43 |
| 21 | 🟡 | Historique | Ouvert sans quête, il tournait à l'infini | État vide | #41 |
| 22 | 🟡 | Succès | Succès boutique et amis affichés seulement à la validation suivante | Vérification après achat, équipement ou nouvel ami | #44 |
| 23 | 🟡 | Boutique | Noms anglais et « ON / EQUIPPED » en anglais dans l'interface française | Traduits | #42 |
| 24 | 🟡 | DA | Ronds restants (aura, carte de rang, pastilles, célébrations…) | Tout carré, sauf la jauge du minuteur | #46, #48, #55 |
| 25 | 🟡 | Tests | Tests d'écran instables sous charge | Délais relevés | #50 |

## Vérifié sans problème

- RLS activée sur les 24 tables ; les écritures directes des joueurs sont limitées à 5 tables, toutes gardées.
- Fonctions serveur : chacune vérifie l'appelant ; celles appelables sans connexion sont des calculs purs ou `username_available`.
- Aucun secret dans le code du site en production.
- Webhook RevenueCat (secret, droit Premium, expiration) ; pubs désactivées sur le web.
- Connexion, erreurs lisibles, langue conservée, déconnexion (données du joueur effacées du téléphone).
- Cycle complet d'une quête, achat et équipement, défis, arène, coop, missions, niveaux, paliers.

## Limites connues (non corrigées)

- Le combat des duels est simulé sur le téléphone (ADR 008) : borné par les limites de duels.
- La pub qui rapporte un jeton de gel n'est pas vérifiée par le serveur.
- Les textes des notifications générées par le serveur sont en anglais (tâche A5).
- La suppression de compte et l'e-mail « mot de passe oublié » n'ont pas pu être testés en local : le test B1 revient à Battiste, en prod.
- Les reels montrent encore l'ancien héros ; les carrousels ont été refaits en anglais (#54).

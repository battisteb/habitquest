# Test complet de l'app (gratuit et Premium) — 2 octobre 2026

Demandé par Battiste : tester toute l'app, en version gratuite puis Premium, et proposer des ajouts ou des retraits selon leur pertinence. Méthode : les 39 écrans en FR et EN avec le compte démo (gratuit puis Premium), relecture écran par écran comme un joueur, lecture du code des limites Premium (`feature-gates.ts`, `use-premium.ts`).

## Bugs trouvés

| # | Gravité | Constat | Correction |
|---|---|---|---|
| 1 | 🟠 | Un joueur Premium voit encore « Passe Premium » dans les Réglages et toute l'offre sur l'écran Premium. | Ces écrans lisent le même statut Premium que le reste de l'app (achat sur le téléphone **ou** statut du serveur). |
| 2 | 🟠 | Les limites internes (jetons de gel, objets épiques et légendaires de la boutique, délai entre duels) ne connaissent que l'achat fait sur le téléphone : sur le web, un joueur Premium est traité comme gratuit. | Même correction, à la source (`feature-gates.ts`). |
| 3 | 🟡 | Les notifications du compte démo local sont en anglais. | Données de démo seulement (les vraies notifications sont traduites) : rien à corriger dans l'app. |

## À retirer

| Élément | Pourquoi | Proposition |
|---|---|---|
| Ligne « Duels : 3 par semaine / 1 par jour » de l'écran Premium | Avec l'arène (un combat par jour pour tout le monde), limiter les duels n'a plus de sens. | Retirer (tâche P2). |
| Ligne « Support prioritaire » de l'écran Premium | Promesse difficile à tenir seul et invérifiable pour le joueur. | Retirer. |
| Écran « Entraînement » (import de séances et de fiches en JSON) | Plus accessible depuis aucun onglet, réservé à des utilisateurs techniques. | Supprimer le code (plus léger, moins à maintenir). |
| Bouton « Duel rapide » sur le profil d'un ami | Fait doublon avec « Défier » juste au-dessus et lance un combat d'entraînement sans lien avec l'ami. | Retirer. |
| **À décider** : les duels entre amis | Trois modes compétitifs se recoupent (duels, arène, défis 1 contre 1). | (a) Garder les duels comme combat amical, illimité, sans or (pour éviter le « farm ») ; (b) les supprimer et garder arène + défis + coop. Recommandation : (a). |

## À ajouter (pour tous)

| Idée | Intérêt | Effort |
|---|---|---|
| Essai Premium de 14 jours après le tutoriel (tâche P4) | Fait découvrir Premium au moment où le joueur est le plus motivé. | Moyen |
| Encouragements entre amis (un 👏 sur une série ou un level-up, sans chat) | Lien social léger, motivation, aucune modération nécessaire. | Moyen |
| Widget iPhone / Android « quêtes du jour » | Rappel visuel permanent, très demandé dans les habit trackers. | Élevé (natif) |
| Validation automatique depuis Santé / Google Fit (pas, sport, sommeil) | Moins de friction pour les quêtes sportives. | Élevé (natif) |

## Idées Premium (tâche P3)

Principe : Premium apporte du **confort** et du **style**, jamais d'avantage dans les classements, l'arène ou les défis (pas de « pay-to-win »).

| Idée | Déjà là ? | Pertinence |
|---|---|---|
| Sans publicité | ✅ | Indispensable |
| Historique complet des stats et « année en pixels » | ✅ | Forte |
| 3 jetons de gel au lieu d'1, gel à moitié prix | ✅ | Forte |
| Objets épiques et légendaires de la boutique | ✅ | Forte |
| **Gel automatique** : un jour manqué utilise un jeton tout seul, la série est sauvée | Nouveau | Très forte (la peur de perdre sa série est la première raison d'abandon) |
| **Compagnon** : un petit familier pixel qui grandit avec ta série et apparaît à côté du héros | Nouveau | Très forte (attachement, se voit sur les captures partagées) |
| **Objet du mois** : un cosmétique exclusif offert chaque mois aux abonnés | Nouveau | Forte (raison de rester abonné, peu de code) |
| **Rappels par quête** (heure différente pour chaque quête, plusieurs rappels) | Nouveau | Forte |
| **Thèmes et couleurs exclusifs** (héros, interface) | En partie | Moyenne |
| Statistiques avancées (meilleur moment de la journée, quêtes liées, export CSV) | Nouveau | Moyenne |
| 2 défis coop en même temps au lieu d'1 | ✅ | Faible, à garder discret |

## Essai gratuit de 14 jours (tâche P4)

- **Quand** : à la fin du tutoriel, un écran « 14 jours de Premium offerts » (bouton principal) avec « Continuer gratuitement » bien visible. Seulement sur iPhone et Android, et seulement si le joueur n'a jamais eu d'essai (vérifié par RevenueCat).
- **Ensuite, des rappels mesurés** : après une série de 7 jours, un passage de rang ou la première semaine terminée ; au plus un rappel tous les 3 jours, plus rien après 3 refus, jamais dans les 24 h après l'inscription.
- **Pendant l'essai** : bandeau discret « Essai Premium : X jours restants », et un message 2 jours avant la fin.
- **Transparence** (exigée par Apple et Google) : « 14 jours gratuits, puis 39,99 $/an (ou 5,99 $/mois). Résiliable à tout moment. » affiché à côté du bouton.
- **À faire par Battiste dans les stores** : ajouter l'essai gratuit de 2 semaines aux deux abonnements (App Store Connect : « Offre de lancement → Essai gratuit, 2 semaines » ; Google Play : « Phase d'essai gratuit, 14 jours » sur l'abonnement de base). RevenueCat le détecte tout seul.

## Animation de level-up (tâche P5)

L'actuelle (étoiles « ★ » de la police, badge qui rebondit en douceur) fait générique. Nouvelle version dans la DA pixel : le héros du joueur au centre dans une aura pixel, des éclats carrés qui jaillissent, le niveau qui défile, le nouveau rang quand il change, une animation par paliers comme un jeu rétro.

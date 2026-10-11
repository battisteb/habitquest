# App Review et fiche « App Privacy »

## Informations pour la revue (App Store Connect → App Review Information)

- **Compte de démo** : QuestTester (e-mail et mot de passe : `PROD_MAIL_TEST_EMAIL` / `PROD_MAIL_TEST_PASSWORD` dans `.env.deploy.local`, à recopier par Battiste dans App Store Connect). Avant chaque soumission, lancer `scripts/demo/seed-review-demo.sql` sur la prod : 6 habitudes avec des séries jusqu'à la veille, niveau 6, l'ami DemoHero et un duel terminé.
- **Notes pour la revue** (à coller) :

  > HabitQuest is a gamified habit tracker: habits become daily quests that earn XP and gold, level up a pixel-art hero and damage a weekly boss. Sign in with the demo account (Sign in → e-mail and password) to see habits with running streaks, a level 6 hero, a friend (DemoHero) and a finished duel (Social tab). Tap a habit on the Quests tab to complete it. Account deletion: Me tab → gear icon → "Delete my account". Premium is an auto-renewable subscription (monthly or yearly) or a one-time lifetime purchase, sold through In-App Purchase. This iOS version shows no ads and does not track users, so there is no App Tracking Transparency prompt.

## Fiche App Privacy (App Store Connect → App Privacy)

**Version iOS 1.0 : pas de publicité** (l'app iOS n'est pas encore dans AdMob, aucun bloc de pub iOS, pas de demande ATT, cf. `ad-service.ts`). Répondre seulement les lignes « App Functionality » ci-dessous, sans IDFA, Advertising Data ni Product Interaction, et **« Data Used to Track You » : aucune**. Le jour où les pubs iOS arrivent, revenir au tableau complet (les lignes AdMob) avant de publier la mise à jour.

Tableau complet (avec AdMob, comme sur Android), d'après l'inventaire des données (`docs/privacy-policy.md`) :

| Type de donnée Apple | Collectée | Liée à l'identité | Suivi (tracking) | Finalités |
|---|---|---|---|---|
| Contact info → Email Address | Oui | Oui | Non | App Functionality |
| Identifiers → User ID | Oui | Oui | Non | App Functionality |
| Identifiers → Device ID (IDFA) | Oui, si ATT accepté | Non | **Oui** | Third-Party Advertising |
| User Content → Other User Content (habitudes, notes, pseudo) | Oui | Oui | Non | App Functionality |
| User Content → Customer Support (messages envoyés via Réglages → Support) | Oui | Oui | Non | App Functionality |
| Purchases → Purchase History | Oui | Oui | Non | App Functionality |
| Usage Data → Product Interaction | Oui (collectée par AdMob) | Non | Oui | Third-Party Advertising |
| Usage Data → Advertising Data | Oui (AdMob) | Non | Oui | Third-Party Advertising |
| Diagnostics → Crash / Performance Data | Oui (Sentry, sans donnée personnelle ; et le SDK AdMob) | Non | Non | App Functionality (Sentry), Third-Party Advertising (AdMob) |

Pas de collecte : localisation, santé, contacts, données financières, historique de navigation, données sensibles.

## Classification d'âge (questionnaire)

- Aucune violence réaliste, contenu sexuel, jeux d'argent, alcool ou drogue.
- Duels : combats pixel art stylisés, sans sang → « Cartoon or Fantasy Violence : Infrequent/Mild ».
- Pas de chat. Seul le profil public (pseudo, avatar, niveau, XP, rang, or, meilleure série) est visible des autres joueurs ; le fuseau horaire, l'abonnement et les messages au Support restent privés (vérifié côté serveur, `supabase/tests/privacy.test.sql`).
- Résultat attendu : **9+** (à cause de la violence cartoon légère) — à confirmer dans le questionnaire.

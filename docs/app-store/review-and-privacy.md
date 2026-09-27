# App Review et fiche « App Privacy »

## Informations pour la revue (App Store Connect → App Review Information)

- **Compte de démo** : ⏳ créer un compte de test avec quelques habitudes, un ami et un duel terminé, puis renseigner e-mail + mot de passe.
- **Notes pour la revue** (à coller) :

  > HabitQuest is a gamified habit tracker. Sign in with the demo account to see existing habits, streaks, a friend and a completed duel. Tap a habit on the Today tab to complete it and earn XP. Account deletion: Settings (gear icon on the Me tab) → "Delete my account". Ads (Google AdMob) are shown to free users only after the App Tracking Transparency prompt; declining still shows non-personalized ads. Premium (in-app subscription via RevenueCat) removes ads.

## Fiche App Privacy (App Store Connect → App Privacy)

Réponses à donner, d'après l'inventaire des données (`docs/privacy-policy.md`) :

| Type de donnée Apple | Collectée | Liée à l'identité | Suivi (tracking) | Finalités |
|---|---|---|---|---|
| Contact info → Email Address | Oui | Oui | Non | App Functionality |
| Identifiers → User ID | Oui | Oui | Non | App Functionality |
| Identifiers → Device ID (IDFA) | Oui, si ATT accepté | Non | **Oui** | Third-Party Advertising |
| User Content → Other User Content (habitudes, notes, pseudo) | Oui | Oui | Non | App Functionality |
| Purchases → Purchase History | Oui | Oui | Non | App Functionality |
| Usage Data → Product Interaction | Oui (collectée par AdMob) | Non | Oui | Third-Party Advertising |
| Usage Data → Advertising Data | Oui (AdMob) | Non | Oui | Third-Party Advertising |
| Diagnostics → Crash / Performance Data | Oui (collectée par le SDK AdMob) | Non | Non | Third-Party Advertising |

Pas de collecte : localisation, santé, contacts, données financières, historique de navigation, données sensibles.

## Classification d'âge (questionnaire)

- Aucune violence réaliste, contenu sexuel, jeux d'argent, alcool ou drogue.
- Duels : combats pixel art stylisés, sans sang → « Cartoon or Fantasy Violence : Infrequent/Mild ».
- Pas de chat. Seuls le pseudo, l'avatar et le niveau sont visibles par les autres joueurs (classement global, recherche d'amis).
- Résultat attendu : **9+** (à cause de la violence cartoon légère) — à confirmer dans le questionnaire.

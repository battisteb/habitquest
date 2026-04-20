# ADR 002 — Modèle de monétisation Freemium

**Date** : 2026-03-27
**Statut** : Décidé

## Contexte

HabitQuest a besoin d'un modèle économique pour financer le développement et maintenir l'infrastructure Supabase. Plusieurs options ont été évaluées :
- Payant unique (one-time purchase)
- Abonnement premium sans publicités
- Freemium avec publicités + abonnement pour supprimer les limitations

## Décision

Modèle **Freemium inspiré de Duolingo** :

### Niveau Gratuit
- Habitudes illimitées
- 1 freeze de streak stocké max (100g d'achat)
- 3 duels/semaine (cooldown 48h)
- Historique stats : 30 jours
- Catalogue boutique : commun/peu commun/rare
- Publicités : bannière bas de page (Social, Stats, Shop) + interstitiel avant duel + rewarded pour freeze bonus

### Niveau Premium (~4,99 €/mois, ~34,99 €/an)
- 3 freezes stockés max (50g d'achat, moitié prix)
- 1 duel/jour (cooldown 24h)
- Historique stats complet
- Catalogue boutique complet (épique/légendaire inclus)
- Sans publicités

### Outils techniques
- **RevenueCat** — gestion des abonnements iOS/Android (SDK `react-native-purchases`)
- **Google AdMob** — réseau publicitaire (SDK `react-native-google-mobile-ads`)
- Clés API dans `subscription-store.ts` et `ad-service.ts` (placeholders jusqu'à configuration dashboard)

## Conséquences

- La valeur perçue du premium doit être visible immédiatement → `PremiumGate` et `PremiumBadge` sur les items verrouillés
- Les publicités doivent être non-intrusives → aucune pub après la complétion d'une habitude (moment positif)
- RevenueCat centralise la vérification des droits → pas de logique custom côté serveur

## Tarif Apple

Apple prélève 30% sur les abonnements (15% après la première année, programme Small Business). À 4,99 €/mois brut, le revenu net est ~3,49 €/mois.

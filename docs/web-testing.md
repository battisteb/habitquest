# Tester HabitQuest sur iPhone sans compte Apple Developer

La version web de l'app s'installe sur l'écran d'accueil de l'iPhone. Elle s'ouvre alors en plein écran comme une vraie app, sans barre Safari.

## Ce qui marche / ne marche pas

| Fonction | Web |
|---|---|
| Compte, habitudes, séries, XP, or, quêtes, défis, duels, boutique, social | ✅ |
| Sons | ✅ (après une première interaction) |
| Notifications push | ❌ (app native uniquement) |
| Publicités, achats Premium | ❌ (app native uniquement) |

## Mise en ligne (une fois les accès reçus)

1. `.env.production.local` (non versionné) :
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<clé anon>
   ```
2. `EXPO_TOKEN=<token>` dans l'environnement, puis `npm run deploy:web` (EAS Hosting, gratuit). La commande affiche l'URL.

> Le fichier `.env.development.local` pointe vers le Supabase local de test (Docker) et ne sert qu'à `expo start`.

## Installer sur l'iPhone

1. Ouvrir l'URL dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil**.
3. Lancer HabitQuest depuis l'icône.

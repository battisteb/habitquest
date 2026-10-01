# E-mails d'authentification

Trois e-mails envoyés par Supabase Auth (via Resend) sont aux couleurs de HabitQuest : confirmation d'inscription, mot de passe oublié, changement d'adresse e-mail.

## Langue

Supabase n'a qu'un modèle par e-mail : chaque modèle contient la version française et la version anglaise, et choisit au moment de l'envoi selon `{{ .Data.language }}` (métadonnées du compte). L'app écrit cette langue à l'inscription et à chaque changement de langue (`syncLanguage`). Sans langue connue (anciens comptes pas encore resynchronisés) : anglais.

## Modifier les textes ou le style

1. Éditer `scripts/auth-emails/build.js` (textes FR/EN, couleurs, mise en page).
2. `node scripts/auth-emails/build.js` → `supabase/templates/*.html` et `subjects.json` (à committer).
3. Envoyer sur le projet (sauvegarde des modèles actuels d'abord) :

```bash
SUPABASE_ACCESS_TOKEN=… node scripts/auth-emails/push.js <project-ref> --backup <fichier.json> --dry-run
SUPABASE_ACCESS_TOKEN=… node scripts/auth-emails/push.js <project-ref> --backup <fichier.json>
```

Retour en arrière : `node scripts/auth-emails/push.js <project-ref> --restore <fichier.json>`.

Variables disponibles dans les modèles : `{{ .ConfirmationURL }}`, `{{ .Email }}`, `{{ .NewEmail }}`, `{{ .Data.* }}`. Mise en page en tableaux et styles en ligne : c'est ce que tous les clients mail affichent correctement.

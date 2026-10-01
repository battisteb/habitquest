---
name: deploy-prod
description: Deploy HabitQuest to production — Supabase migrations, Edge Functions, auth e-mail templates and/or the web app (EAS Hosting) — with the mandatory backup, smoke test and JOURNAL line. Use after a PR is merged on main and something must reach prod.
---

# Déployer en production

Règle (PLAN.md, 2026-09-30) : Claude déploie seul les migrations, les Edge Functions et le site, **toujours après une sauvegarde prod** et avec une ligne dans `JOURNAL.md`. Jamais de soumission aux stores, de build EAS de production ni de paiement sans accord explicite de Battiste.

Projet Supabase prod : `aksxyaullvozlkzcegth`. Site : https://habitquest.expo.app

## 0. Préparer

- Travailler depuis **son propre worktree** sur `origin/main` à jour (`git fetch && git checkout --detach origin/main`), jamais dans le worktree d'une autre session. Vérifier avec `ListAgents` qu'aucune autre session ne déploie au même moment.
- Les secrets sont dans `<repo principal>/.env.deploy.local` (fichier avec BOM : ne pas le `source`). Lire une valeur sans l'afficher :

```bash
E=<repo principal>/.env.deploy.local
getv() { grep -E "^\s*$1\s*=" $E | head -1 | cut -d= -f2- | tr -d '"\r '; }
export SUPABASE_ACCESS_TOKEN=$(getv SUPABASE_ACCESS_TOKEN) SUPABASE_DB_PASSWORD=$(getv SUPABASE_DB_PASSWORD)
```

- Ne jamais afficher un secret dans la sortie, un commit ou un fichier versionné.

## 1. Migrations (si `supabase/migrations/` a changé)

```bash
npx supabase link --project-ref aksxyaullvozlkzcegth   # une fois par worktree
npx supabase db push --linked --dry-run                # liste exacte de ce qui part
TS=$(date +%Y%m%d-%H%M)
npx supabase db dump --linked -f <backup>/prod-schema-$TS.sql
npx supabase db dump --linked --data-only -f <backup>/prod-data-$TS.sql
[ -s <backup>/prod-data-$TS.sql ] || echo "SAUVEGARDE VIDE : STOP"
echo Y | npx supabase db push --linked
```

`<backup>` = dossier hors du repo (scratchpad). Si la sauvegarde est vide ou échoue : ne rien pousser.

## 2. Edge Functions (si `supabase/functions/` a changé)

`npx supabase functions deploy <nom> --project-ref aksxyaullvozlkzcegth` (ajouter `--no-verify-jwt` seulement pour `dispatch-push` et `revenuecat-webhook`, voir les ADR 006 et 008).

## 3. E-mails d'authentification (si `supabase/templates/` a changé)

```bash
node scripts/auth-emails/push.js aksxyaullvozlkzcegth --backup <backup>/auth-email-templates-$TS.json --dry-run
node scripts/auth-emails/push.js aksxyaullvozlkzcegth --backup <backup>/auth-email-templates-$TS.json
```

## 4. Site web

```bash
cp <repo principal>/.env.production.local .
EXPO_TOKEN=$(getv EXPO_TOKEN) npm run deploy:web
rm -f .env.production.local                            # toujours, même en cas d'échec
```

## 4 bis. Mise à jour à distance des apps (EAS Update, ADR 014)

Pour un correctif **JavaScript uniquement** des apps iOS/Android déjà publiées (rien de natif : voir le tableau de l'ADR 014) :

```bash
EXPO_TOKEN=$(getv EXPO_TOKEN) npm run update:preview -- --message "fix: …"      # puis vérifier sur un build preview
EXPO_TOKEN=$(getv EXPO_TOKEN) npm run update:production -- --message "fix: …"
```

Si la mise à jour dépend d'une migration : migration d'abord, compatible avec la version précédente de l'app. Retour en arrière : `npx eas-cli update:republish --group <id précédent>`.

## 5. Vérifier

```bash
npm i --no-save puppeteer-core   # une fois
SMOKE_EMAIL=$(getv PROD_TEST_EMAIL) SMOKE_PASSWORD=$(getv PROD_TEST_PASSWORD) SMOKE_LANGS=fr \
  node scripts/smoke-web.js https://habitquest.expo.app
```

Attendu : « 0 screen(s) with problems ». Une erreur « Unexpected token '<' » juste après un déploiement est transitoire : relancer une fois. Vérifier aussi à la main l'écran ou le parcours touché.

## 6. Tracer

Une ligne dans `JOURNAL.md` : PR, migrations appliquées, nom de la sauvegarde, résultat du smoke test. Cocher la tâche dans `PLAN.md`.

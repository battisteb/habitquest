# Lire les messages du support

Les joueurs écrivent depuis **Réglages → 💬 Support** (type : problème, idée ou autre). Chaque message arrive dans la table `support_messages` de Supabase.

## Les lire

Supabase → projet HabitQuest → **Table Editor** → `support_messages` (tri par `created_at`).

Ou dans **SQL Editor**, avec le nom et l'e-mail du joueur pour lui répondre :

```sql
select s.created_at, s.category, s.status, p.username, u.email, s.message, s.platform, s.app_version, s.language
from support_messages s
join profiles p on p.id = s.user_id
join auth.users u on u.id = s.user_id
where s.status <> 'done'
order by s.created_at desc;
```

## Les traiter

Changer `status` dans le Table Editor : `new` → `read` (lu) → `done` (traité). Le joueur voit ce statut sous « Tes messages » (Envoyé, Lu, Traité).

## Règles

- Un joueur ne voit que ses propres messages et ne peut ni les modifier ni changer le statut.
- 5 messages maximum par jour et par joueur ; de 5 à 2 000 caractères.
- Contexte joint automatiquement : plateforme (ios, android, web), version de l'app, langue.
- Les messages sont supprimés avec le compte du joueur.

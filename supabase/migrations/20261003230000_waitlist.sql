-- Launch waitlist (L4, Battiste 2026-10-03): visitors of gethabitquest.com
-- leave their e-mail to be told when the apps are out. Insert-only for the
-- public (anon key from the site): nobody can read the list from outside;
-- it is read with the service role. E-mailing it needs Battiste's approval.

create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text not null default 'en' check (lang in ('en', 'fr', 'de', 'pt', 'ja')),
  consent boolean not null check (consent),
  created_at timestamptz not null default now(),
  constraint waitlist_email_format check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

-- One entry per address, whatever its case.
create unique index if not exists waitlist_email_key on public.waitlist (lower(email));

alter table public.waitlist enable row level security;
drop policy if exists "anyone can join the waitlist" on public.waitlist;
create policy "anyone can join the waitlist" on public.waitlist
  for insert to anon, authenticated with check (consent);

revoke all on public.waitlist from anon, authenticated;
grant insert (email, lang, consent) on public.waitlist to anon, authenticated;

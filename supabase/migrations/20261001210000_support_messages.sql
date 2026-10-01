-- Support: players report a problem or share an idea from Settings → Support.
-- The team reads them in the Supabase dashboard (table support_messages) and
-- moves `status` from 'new' to 'read' then 'done'; players see that status.

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category text not null check (category in ('bug', 'idea', 'other')),
  message text not null check (char_length(btrim(message)) between 5 and 2000),
  -- Context for the team: no personal data beyond the account.
  platform text check (char_length(platform) <= 20),
  app_version text check (char_length(app_version) <= 20),
  language text check (language in ('en', 'fr')),
  status text not null default 'new' check (status in ('new', 'read', 'done')),
  created_at timestamptz not null default now()
);

create index support_messages_user_idx on public.support_messages (user_id, created_at desc);
create index support_messages_status_idx on public.support_messages (status, created_at desc);

alter table public.support_messages enable row level security;

create policy support_messages_insert on public.support_messages
  for insert to authenticated
  with check (user_id = auth.uid());

create policy support_messages_select on public.support_messages
  for select to authenticated
  using (user_id = auth.uid());

-- No update or delete for players: the status belongs to the team.
grant select, insert on public.support_messages to authenticated;

-- Spam guard: a new message always starts unread, at most 5 per day.
create or replace function public.guard_support_messages()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;
  new.status := 'new';
  new.created_at := now();
  if (select count(*) from public.support_messages
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many support messages today' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_support_messages
  before insert on public.support_messages
  for each row execute function public.guard_support_messages();

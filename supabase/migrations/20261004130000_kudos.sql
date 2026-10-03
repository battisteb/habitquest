-- Kudos between friends (G4): one 👏 per friend per day, once they have
-- validated a quest that day. The friend gets a notification (in their
-- language; the push itself follows the 2-a-day budget of ADR 026).

create table if not exists public.kudos (
  from_user uuid not null references public.profiles(id) on delete cascade,
  to_user uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (from_user, to_user, day),
  check (from_user <> to_user)
);

alter table public.kudos enable row level security;

drop policy if exists "Players see their own kudos" on public.kudos;
create policy "Players see their own kudos" on public.kudos
  for select to authenticated
  using (from_user = (select auth.uid()) or to_user = (select auth.uid()));

revoke all on public.kudos from anon, authenticated;
grant select on public.kudos to authenticated;

create index if not exists kudos_to_user_idx on public.kudos (to_user, day);

-- True when both players are accepted friends.
create or replace function public.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = p_a and f.addressee_id = p_b)
        or (f.requester_id = p_b and f.addressee_id = p_a))
  );
$$;

revoke all on function public.are_friends(uuid, uuid) from public, anon, authenticated;

-- My friends' day: quests validated today (in their time zone) and whether I
-- already cheered them today (in mine). Only accepted friends.
create or replace function public.friends_today()
returns table (friend_id uuid, done_today integer, kudos_sent boolean, kudos_received integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  return query
  with friends as (
    select case when f.requester_id = v_uid then f.addressee_id else f.requester_id end as id
    from public.friendships f
    where f.status = 'accepted' and (f.requester_id = v_uid or f.addressee_id = v_uid)
  )
  select
    fr.id,
    (select count(*)::integer
       from public.completions c
       join public.habits h on h.id = c.habit_id
      where h.user_id = fr.id
        and public.user_local_date(fr.id, c.completed_at) = public.user_today(fr.id)),
    exists (select 1 from public.kudos k
             where k.from_user = v_uid and k.to_user = fr.id and k.day = public.user_today(v_uid)),
    (select count(*)::integer from public.kudos k
      where k.from_user = fr.id and k.to_user = v_uid and k.day = public.user_today(v_uid))
  from friends fr;
end;
$$;

revoke all on function public.friends_today() from public, anon;
grant execute on function public.friends_today() to authenticated;

create or replace function public.give_kudos(p_friend_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date;
  v_name text;
  v_lang text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_friend_id is null or p_friend_id = v_uid or not public.are_friends(v_uid, p_friend_id) then
    return json_build_object('success', false, 'reason', 'not_friends');
  end if;
  -- Cheer a real effort: the friend validated at least one quest today.
  if not exists (
    select 1 from public.completions c
    join public.habits h on h.id = c.habit_id
    where h.user_id = p_friend_id
      and public.user_local_date(p_friend_id, c.completed_at) = public.user_today(p_friend_id)
  ) then
    return json_build_object('success', false, 'reason', 'nothing_today');
  end if;

  v_day := public.user_today(v_uid);
  insert into public.kudos (from_user, to_user, day) values (v_uid, p_friend_id, v_day)
  on conflict do nothing;
  if not found then
    return json_build_object('success', false, 'reason', 'already_sent');
  end if;

  select username into v_name from public.profiles where id = v_uid;
  select language into v_lang from public.profiles where id = p_friend_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_friend_id,
    'kudos',
    case v_lang when 'fr' then '👏 Bravo !' when 'ja' then '👏 ナイス！' else '👏 Kudos!' end,
    case v_lang
      when 'fr' then v_name || ' t''encourage pour tes quêtes du jour !'
      when 'ja' then v_name || 'さんが今日のクエストを応援しています！'
      else v_name || ' cheers you on for today''s quests!'
    end,
    jsonb_build_object('route', '/(tabs)/social', 'fromUserId', v_uid)
  );

  return json_build_object('success', true);
end;
$$;

revoke all on function public.give_kudos(uuid) from public, anon;
grant execute on function public.give_kudos(uuid) to authenticated;

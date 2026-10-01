-- Pre-release audit (Supabase security and performance advisors).
--
-- 1. Private profile fields: any signed-in player could read every other
--    player's time zone, language, subscription, RevenueCat id, freeze
--    tokens and last duel. They now keep the public fields only; a player
--    reads their own full profile with get_my_profile().
-- 2. Trigger functions are no longer executable through the API, and the
--    leftover notify_duel_invite (its trigger was dropped) is removed.
-- 3. GraphQL is not used by the app: the endpoint is removed.
-- 4. RLS policies call auth.uid() once per query instead of once per row.
-- 5. Duplicate SELECT policies merged; foreign keys get covering indexes.

-- 1. Private profile fields ---------------------------------------------------

revoke select on public.profiles from authenticated, anon;
grant select (id, username, xp, level, rank, created_at, gold, active_theme,
              skin_color, hair_color, eye_color, best_streak)
  on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer set search_path = ''
as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- Helpers for checks that run with the player's rights; the `private` schema
-- is not exposed by the API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_premium(p_uid uuid)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((
    select subscription_status = 'premium'
           and (subscription_expires_at is null or subscription_expires_at > now())
    from public.profiles where id = p_uid), false);
$$;
revoke all on function private.is_premium(uuid) from public;
grant execute on function private.is_premium(uuid) to authenticated;

create or replace function public.guard_duel_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_premium boolean;
  v_last timestamptz;
begin
  -- Only client writes are limited; server code (definer functions) is trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    v_premium := private.is_premium(new.challenger_id);

    select max(d.created_at) into v_last
    from public.duels d
    where (d.challenger_id = new.challenger_id or d.opponent_id = new.challenger_id)
      and d.status <> 'cancelled';
    if v_last is not null
       and v_last > now() - (case when v_premium then interval '24 hours' else interval '48 hours' end) then
      raise exception 'Duel cooldown not over' using errcode = '42501';
    end if;

    if not v_premium and (
        select count(*) from public.duels d
        where (d.challenger_id = new.challenger_id or d.opponent_id = new.challenger_id)
          and d.status <> 'cancelled'
          and d.created_at >= date_trunc('week', now())) >= 3 then
      raise exception 'Weekly duel limit reached' using errcode = '42501';
    end if;
    new.status := 'pending';
    new.winner_id := null;
    new.winner_rewarded := false;
    new.loser_rewarded := false;
    return new;
  end if;

  if new.winner_rewarded is distinct from old.winner_rewarded
     or new.loser_rewarded is distinct from old.loser_rewarded
     or new.challenger_id is distinct from old.challenger_id
     or new.opponent_id is distinct from old.opponent_id then
    raise exception 'Protected duel fields' using errcode = '42501';
  end if;
  if old.status in ('resolved', 'cancelled')
     and (new.status, new.winner_id) is distinct from (old.status, old.winner_id) then
    raise exception 'Duel already over' using errcode = '42501';
  end if;
  if new.status = 'resolved' and old.status <> 'resolved' and auth.uid() is distinct from old.challenger_id then
    raise exception 'Only the challenger records the result' using errcode = '42501';
  end if;
  if new.status <> 'resolved' and new.winner_id is not null then
    raise exception 'Only a finished duel has a winner' using errcode = '42501';
  end if;
  if new.winner_id is not null and new.winner_id not in (new.challenger_id, new.opponent_id) then
    raise exception 'Winner must be a player of the duel' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 2. Trigger functions --------------------------------------------------------

drop function if exists public.notify_duel_invite();

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;
end;
$$;

-- 3. GraphQL ------------------------------------------------------------------

drop extension if exists pg_graphql;

-- 4. auth.uid() evaluated once per query --------------------------------------

do $$
declare
  p record;
  v_using text;
  v_check text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') || coalesce(with_check, '')) like '%auth.uid()%'
  loop
    v_using := replace(replace(p.qual, '( SELECT auth.uid() AS uid)', 'auth.uid()'), 'auth.uid()', '(select auth.uid())');
    v_check := replace(replace(p.with_check, '( SELECT auth.uid() AS uid)', 'auth.uid()'), 'auth.uid()', '(select auth.uid())');
    if v_using is not null then
      execute format('alter policy %I on %I.%I using (%s)', p.policyname, p.schemaname, p.tablename, v_using);
    end if;
    if v_check is not null then
      execute format('alter policy %I on %I.%I with check (%s)', p.policyname, p.schemaname, p.tablename, v_check);
    end if;
  end loop;
end;
$$;

-- 5. Duplicate SELECT policies, foreign key indexes ----------------------------

-- "Publicly readable" already covers the player's own rows.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can view own equipped items" on public.equipped_items;
drop policy if exists "Users can view own achievements" on public.user_achievements;
alter policy "Profiles are publicly readable" on public.profiles to authenticated;
alter policy "Equipped items are publicly readable" on public.equipped_items to authenticated;
alter policy "Users can view others achievements" on public.user_achievements to authenticated;

create index if not exists arena_members_user_idx on public.arena_members (user_id);
create index if not exists arena_players_last_group_idx on public.arena_players (last_group_id);
create index if not exists challenges_winner_idx on public.challenges (winner_id);
create index if not exists coop_challenges_creator_idx on public.coop_challenges (creator_id);
create index if not exists duels_winner_idx on public.duels (winner_id);
create index if not exists equipped_items_item_idx on public.equipped_items (item_id);
create index if not exists purchases_item_idx on public.purchases (item_id);
create index if not exists user_achievements_achievement_idx on public.user_achievements (achievement_id);

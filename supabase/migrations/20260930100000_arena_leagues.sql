-- Arenas (ADR 012): 6 leagues, 10-day seasons, groups of 11 players.
-- On day d of a season, the player in slot s attacks slot (s + d + 1) % 11,
-- so everyone attacks every other member exactly once. A fight is resolved
-- by the server once the day is over for both players: attack = habits done
-- that day + level + streak, defense = the same with habits counting half.
-- Only the attacker scores, a defeat never costs anything. Empty slots are
-- bots, clearly flagged. Everything goes through arena_state(); the tables
-- themselves are not readable by clients.

create table if not exists public.arena_groups (
  id uuid primary key default gen_random_uuid(),
  season integer not null,
  tier smallint not null check (tier between 1 and 6),
  -- A group created mid-season only plays from that day on.
  start_day smallint not null default 0 check (start_day between 0 and 9),
  created_at timestamptz not null default now()
);

create index if not exists arena_groups_season_tier_idx on public.arena_groups (season, tier);

create table if not exists public.arena_members (
  group_id uuid not null references public.arena_groups(id) on delete cascade,
  slot smallint not null check (slot between 0 and 10),
  user_id uuid not null references public.profiles(id) on delete cascade,
  season integer not null,
  joined_on date not null,
  primary key (group_id, slot),
  unique (season, user_id)
);

create table if not exists public.arena_players (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  tier smallint not null default 1 check (tier between 1 and 6),
  last_group_id uuid references public.arena_groups(id) on delete set null,
  -- Outcome of the previous season, shown once by the app.
  last_result jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.arena_fights (
  group_id uuid not null references public.arena_groups(id) on delete cascade,
  day smallint not null check (day between 0 and 9),
  attacker_slot smallint not null,
  defender_slot smallint not null,
  attacker_id uuid references public.profiles(id) on delete set null,
  defender_id uuid references public.profiles(id) on delete set null,
  attacker_is_bot boolean not null,
  defender_is_bot boolean not null,
  attacker_name text not null,
  defender_name text not null,
  attacker_habits smallint not null,
  defender_habits smallint not null,
  attack_power integer not null,
  defense_power integer not null,
  won boolean not null,
  points smallint not null,
  gold integer not null default 0,
  resolved_at timestamptz not null default now(),
  primary key (group_id, day, attacker_slot)
);

create index if not exists arena_fights_attacker_idx on public.arena_fights (attacker_id);
create index if not exists arena_fights_defender_idx on public.arena_fights (defender_id);

-- No policies: clients only go through arena_state().
alter table public.arena_groups enable row level security;
alter table public.arena_members enable row level security;
alter table public.arena_players enable row level security;
alter table public.arena_fights enable row level security;

grant all on public.arena_groups, public.arena_members, public.arena_players, public.arena_fights
  to service_role;

-- =============================================================================
-- Balance — mirrors ARENA in src/lib/constants/game-config.ts
-- =============================================================================

create or replace function public.arena_attack_power(p_habits integer, p_level integer, p_streak integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 100 + 30 * least(greatest(p_habits, 0), 5) + 2 * greatest(p_level, 0)
       + 3 * least(greatest(p_streak, 0), 30);
$$;

create or replace function public.arena_defense_power(p_habits integer, p_level integer, p_streak integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 100 + 15 * least(greatest(p_habits, 0), 5) + 2 * greatest(p_level, 0)
       + 3 * least(greatest(p_streak, 0), 30);
$$;

-- =============================================================================
-- Calendar
-- =============================================================================

-- Season 0 starts on Monday 2026-09-28; every season lasts 10 days.
create or replace function public.arena_season_start(p_season integer)
returns date
language sql
immutable
set search_path = ''
as $$
  select date '2026-09-28' + p_season * 10;
$$;

create or replace function public.arena_season_for(p_date date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select floor((p_date - date '2026-09-28') / 10.0)::integer;
$$;

-- Deterministic value in [0, p_mod) (bots, luck), so a fight always resolves the same way.
create or replace function public.arena_hash(p_key text, p_mod integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select (((hashtext(p_key)::bigint % p_mod) + p_mod) % p_mod)::integer;
$$;

-- 7 is coprime with 20, so the 11 slots of a group get 11 different names.
create or replace function public.arena_bot_name(p_group uuid, p_slot integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['Grimbold', 'Sylvara', 'Torvin', 'Maelys', 'Brakk', 'Elowen', 'Kaelen', 'Isolde',
                'Rurik', 'Nyssa', 'Dorian', 'Liora', 'Fenrik', 'Ysolde', 'Garrick', 'Thalia',
                'Orwin', 'Selene', 'Barnaby', 'Morgane'])
         [1 + (public.arena_hash(p_group::text, 20) + p_slot * 7) % 20];
$$;

-- Who holds a slot on a given day, with the stats used by the fight.
-- A player counts from the day they joined; before that the slot is a bot.
create or replace function public.arena_participant(p_group uuid, p_slot integer, p_date date)
returns table (user_id uuid, is_bot boolean, username text, level integer, streak integer,
               habits integer, tz text)
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_user uuid;
  v_tier smallint;
  v_seed integer;
begin
  select m.user_id into v_user from public.arena_members m
  where m.group_id = p_group and m.slot = p_slot and m.joined_on <= p_date;

  if v_user is not null then
    return query
      select p.id, false, p.username, p.level,
        coalesce((select max(s.current_count) from public.streaks s
                  join public.habits h on h.id = s.habit_id
                  where h.user_id = p.id and not h.is_archived), 0)::integer,
        least(5, (select count(*) from public.completions c
                  join public.habits h on h.id = c.habit_id
                  where h.user_id = p.id
                    and (c.completed_at at time zone p.timezone)::date = p_date))::integer,
        p.timezone
      from public.profiles p where p.id = v_user;
    return;
  end if;

  select g.tier into v_tier from public.arena_groups g where g.id = p_group;
  v_seed := public.arena_hash(p_group::text || ':' || p_slot, 1000);
  return query select
    null::uuid, true, public.arena_bot_name(p_group, p_slot),
    (2 * v_tier - 1 + v_seed % 3)::integer,
    (3 * v_tier + v_seed % 8)::integer,
    -- 0-3 habits a day in Bronze/Silver, up to 4 from Gold, up to 5 in Master.
    public.arena_hash(p_group::text || ':' || p_slot || ':' || p_date, 4 + v_tier / 3),
    null::text;
end;
$$;

-- =============================================================================
-- Resolution
-- =============================================================================

-- Resolves every fight of the group whose day is over for both sides. Idempotent.
create or replace function public.arena_resolve_group(p_group uuid)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_group public.arena_groups;
  v_start date;
  v_date date;
  v_day integer;
  v_slot integer;
  v_def integer;
  v_att record;
  v_dfd record;
  v_ap integer;
  v_dp integer;
  v_won boolean;
  v_points integer;
  v_gold integer;
begin
  select * into v_group from public.arena_groups where id = p_group for update;
  if not found then
    return;
  end if;
  v_start := public.arena_season_start(v_group.season);

  for v_day in v_group.start_day..9 loop
    v_date := v_start + v_day;
    -- No time zone is more than 14 h ahead of UTC.
    exit when now() < v_date::timestamp at time zone 'UTC' + interval '10 hours';

    for v_slot in 0..10 loop
      continue when exists (select 1 from public.arena_fights f
                            where f.group_id = p_group and f.day = v_day and f.attacker_slot = v_slot);

      v_def := (v_slot + v_day + 1) % 11;
      select * into v_att from public.arena_participant(p_group, v_slot, v_date);
      select * into v_dfd from public.arena_participant(p_group, v_def, v_date);

      -- Wait until the day is over for both players (bots follow their opponent).
      continue when now() < greatest(
        (v_date + 1)::timestamp at time zone coalesce(v_att.tz, v_dfd.tz, 'UTC'),
        (v_date + 1)::timestamp at time zone coalesce(v_dfd.tz, v_att.tz, 'UTC'));

      v_ap := public.arena_attack_power(v_att.habits, v_att.level, v_att.streak);
      v_dp := public.arena_defense_power(v_dfd.habits, v_dfd.level, v_dfd.streak);
      -- Luck: attack × 0.85 to 1.15.
      v_won := round(v_ap * (85 + public.arena_hash(
                 p_group::text || ':' || v_day || ':' || v_slot || ':luck', 31)) / 100.0) > v_dp;
      v_points := case when v_won then 3 when v_att.habits > 0 then 1 else 0 end;
      v_gold := case when v_won and not v_att.is_bot then 10 else 0 end;

      insert into public.arena_fights (
        group_id, day, attacker_slot, defender_slot, attacker_id, defender_id,
        attacker_is_bot, defender_is_bot, attacker_name, defender_name,
        attacker_habits, defender_habits, attack_power, defense_power, won, points, gold)
      values (
        p_group, v_day, v_slot, v_def, v_att.user_id, v_dfd.user_id,
        v_att.is_bot, v_dfd.is_bot, v_att.username, v_dfd.username,
        v_att.habits, v_dfd.habits, v_ap, v_dp, v_won, v_points, v_gold);

      if v_gold > 0 then
        perform public.award(v_att.user_id, 0, v_gold);
      end if;
    end loop;
  end loop;
end;
$$;

-- Current table of a group. A slot's score only counts the fights of its current holder.
create or replace function public.arena_standings(p_group uuid)
returns table (slot integer, user_id uuid, is_bot boolean, username text, level integer,
               points integer, wins integer, fights integer, place integer)
language sql
stable
security definer set search_path = ''
as $$
  with slots as (
    select s.slot, m.user_id
    from generate_series(0, 10) as s(slot)
    left join public.arena_members m on m.group_id = p_group and m.slot = s.slot
  ), scored as (
    select sl.slot, sl.user_id, sl.user_id is null as is_bot,
      coalesce(p.username, public.arena_bot_name(p_group, sl.slot)) as username,
      coalesce(p.level, (2 * g.tier - 1
        + public.arena_hash(p_group::text || ':' || sl.slot, 1000) % 3)) as level,
      coalesce(sum(f.points), 0)::integer as points,
      count(f.*) filter (where f.won)::integer as wins,
      count(f.*)::integer as fights
    from slots sl
    join public.arena_groups g on g.id = p_group
    left join public.profiles p on p.id = sl.user_id
    left join public.arena_fights f on f.group_id = p_group and f.attacker_slot = sl.slot
      and ((sl.user_id is null and f.attacker_is_bot)
        or (sl.user_id is not null and f.attacker_id = sl.user_id and not f.attacker_is_bot))
    group by sl.slot, sl.user_id, p.username, p.level, g.tier
  )
  select sc.slot, sc.user_id, sc.is_bot, sc.username, sc.level, sc.points, sc.wins, sc.fights,
    (row_number() over (order by sc.points desc, sc.wins desc, sc.slot))::integer
  from scored sc
  order by 9;
$$;

-- =============================================================================
-- Entry point for the app
-- =============================================================================

-- Joins the current season if needed (settling the previous one: top 3 go up a
-- league, bottom 3 go down), resolves due fights and returns the arena screen.
create or replace function public.arena_state()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_today date;
  v_season integer;
  v_start date;
  v_player public.arena_players;
  v_member public.arena_members;
  v_prev_season integer;
  v_place integer;
  v_tier smallint;
  v_group uuid;
  v_slot integer;
  v_day integer;
  v_opp record;
  v_att record;
  v_self record;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_today := public.user_today(v_me);
  v_season := public.arena_season_for(v_today);
  v_start := public.arena_season_start(v_season);
  v_day := v_today - v_start;

  select * into v_member from public.arena_members where user_id = v_me and season = v_season;

  if not found then
    insert into public.arena_players (user_id) values (v_me) on conflict (user_id) do nothing;
    select * into v_player from public.arena_players where user_id = v_me for update;

    -- Settle the last season played.
    if v_player.last_group_id is not null then
      select season into v_prev_season from public.arena_groups where id = v_player.last_group_id;
      if v_prev_season < v_season then
        perform public.arena_resolve_group(v_player.last_group_id);
        select st.place into v_place from public.arena_standings(v_player.last_group_id) st
        where st.user_id = v_me;
        v_tier := case
          when v_place <= 3 then least(6, v_player.tier + 1)
          when v_place >= 9 then greatest(1, v_player.tier - 1)
          else v_player.tier end;
        update public.arena_players
        set tier = v_tier,
            last_result = json_build_object('season', v_prev_season, 'place', v_place,
                                            'from_tier', v_player.tier, 'to_tier', v_tier)::jsonb,
            updated_at = now()
        where user_id = v_me;
        v_player.tier := v_tier;
      end if;
    end if;

    -- Fill the oldest group of this league that still has room, or open a new one.
    perform pg_advisory_xact_lock(hashtext('arena:' || v_season || ':' || v_player.tier));
    select g.id into v_group from public.arena_groups g
    where g.season = v_season and g.tier = v_player.tier
      and (select count(*) from public.arena_members m where m.group_id = g.id) < 11
    order by g.created_at, g.id
    limit 1;

    if v_group is null then
      insert into public.arena_groups (season, tier, start_day)
      values (v_season, v_player.tier, v_day)
      returning id into v_group;
    end if;

    select min(s.slot) into v_slot from generate_series(0, 10) as s(slot)
    where not exists (select 1 from public.arena_members m where m.group_id = v_group and m.slot = s.slot);

    insert into public.arena_members (group_id, slot, user_id, season, joined_on)
    values (v_group, v_slot, v_me, v_season, v_today)
    returning * into v_member;

    update public.arena_players set last_group_id = v_group, updated_at = now() where user_id = v_me;
  end if;

  select * into v_player from public.arena_players where user_id = v_me;
  perform public.arena_resolve_group(v_member.group_id);

  select * into v_self from public.arena_participant(v_member.group_id, v_member.slot, v_today);
  select * into v_opp from public.arena_participant(v_member.group_id, (v_member.slot + v_day + 1) % 11, v_today);
  select * into v_att from public.arena_participant(v_member.group_id, (v_member.slot - v_day - 1 + 22) % 11, v_today);

  return json_build_object(
    'season', v_season,
    'tier', (select tier from public.arena_groups where id = v_member.group_id),
    'day', v_day,
    'season_ends_on', v_start + 9,
    'last_result', v_player.last_result,
    'standings', (select json_agg(json_build_object(
        'place', st.place, 'username', st.username, 'is_bot', st.is_bot, 'is_me', st.user_id = v_me,
        'level', st.level, 'points', st.points, 'wins', st.wins, 'fights', st.fights) order by st.place)
      from public.arena_standings(v_member.group_id) st),
    'today', json_build_object(
      'my_habits', v_self.habits,
      'attack_power', public.arena_attack_power(v_self.habits, v_self.level, v_self.streak),
      'opponent', json_build_object(
        'username', v_opp.username, 'is_bot', v_opp.is_bot, 'level', v_opp.level,
        'streak', v_opp.streak,
        'defense_power', public.arena_defense_power(v_opp.habits, v_opp.level, v_opp.streak)),
      'attacker', json_build_object('username', v_att.username, 'is_bot', v_att.is_bot)),
    'recent', (select coalesce(json_agg(r order by r.season_day desc, r.role), '[]'::json) from (
        select f.day as season_day,
          case when f.attacker_id = v_me and not f.attacker_is_bot then 'attack' else 'defense' end as role,
          case when f.attacker_id = v_me and not f.attacker_is_bot then f.defender_name else f.attacker_name end
            as opponent,
          case when f.attacker_id = v_me and not f.attacker_is_bot then f.defender_is_bot else f.attacker_is_bot end
            as opponent_is_bot,
          f.won, f.points, f.gold, f.attack_power, f.defense_power
        from public.arena_fights f
        where f.group_id = v_member.group_id
          and ((f.attacker_id = v_me and not f.attacker_is_bot)
            or (f.defender_id = v_me and not f.defender_is_bot))
        order by f.day desc
        limit 10) r)
  );
end;
$$;

-- The app dismisses the promotion/relegation banner once it has been shown.
create or replace function public.arena_ack_result()
returns void
language sql
security definer set search_path = ''
as $$
  update public.arena_players set last_result = null where user_id = auth.uid();
$$;

revoke all on function public.arena_participant(uuid, integer, date) from public, anon, authenticated;
revoke all on function public.arena_resolve_group(uuid) from public, anon, authenticated;
revoke all on function public.arena_standings(uuid) from public, anon, authenticated;
revoke all on function public.arena_state() from public, anon;
revoke all on function public.arena_ack_result() from public, anon;
grant execute on function public.arena_state() to authenticated;
grant execute on function public.arena_ack_result() to authenticated;

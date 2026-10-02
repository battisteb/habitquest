-- Progressive unlocks (I6, Battiste 2026-10-02): a new player is not shown
-- everything at once. The arena opens at level 3, friend duels and co-op
-- challenges at level 5 (the app announces each unlock with Pip). Mirrors
-- UNLOCKS in src/lib/constants/game-config.ts — change both together.

create or replace function public.unlock_level(p_feature text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_feature when 'arena' then 3 when 'duels' then 5 when 'coop' then 5 else 1 end;
$$;

create or replace function public.feature_unlocked(p_user_id uuid, p_feature text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select level from public.profiles where id = p_user_id), 1) >= public.unlock_level(p_feature);
$$;

-- Readable by players: the duel guard trigger runs with their rights, and levels are public anyway.

-- ─── Arena: closed below level 3 ───
CREATE OR REPLACE FUNCTION public.arena_state()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
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

  -- Progressive unlock (I6): the arena opens at level 3; no enrolment before.
  if not public.feature_unlocked(v_me, 'arena') then
    return json_build_object('locked', true, 'unlock_level', public.unlock_level('arena'));
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
      'attack_power', public.arena_attack_power(v_self.habits, v_self.level, v_self.streak)
                      + public.arena_gear_attack(v_self.user_id),
      'opponent', json_build_object(
        'username', v_opp.username, 'is_bot', v_opp.is_bot, 'level', v_opp.level,
        'streak', v_opp.streak,
        'defense_power', public.arena_defense_power(v_opp.habits, v_opp.level, v_opp.streak)
                         + public.arena_gear_defense(v_opp.user_id)),
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

-- ─── Co-op challenges: from level 5 ───
CREATE OR REPLACE FUNCTION public.create_coop_challenge(p_friend_ids uuid[], p_goal text, p_target integer, p_days integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  v_me uuid := auth.uid();
  v_friends uuid[];
  v_friend uuid;
  v_id uuid;
  v_name text;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not public.feature_unlocked(v_me, 'coop') then
    raise exception 'Co-op challenges unlock at level %', public.unlock_level('coop') using errcode = '42501';
  end if;

  select coalesce(array_agg(distinct f), '{}') into v_friends
  from unnest(p_friend_ids) as f where f is not null and f <> v_me;

  if cardinality(v_friends) not between 1 and 3 then
    raise exception 'A co-op challenge needs 1 to 3 friends' using errcode = '22023';
  end if;
  if p_goal not in ('validations', 'xp') or p_days not in (3, 7, 14)
     or (p_goal = 'validations' and p_target not between 3 and 200)
     or (p_goal = 'xp' and p_target not between 30 and 5000) then
    raise exception 'Invalid co-op challenge' using errcode = '22023';
  end if;

  foreach v_friend in array v_friends loop
    if not exists (
      select 1 from public.friendships
      where status = 'accepted'
        and ((requester_id = v_me and addressee_id = v_friend)
          or (requester_id = v_friend and addressee_id = v_me))) then
      raise exception 'You can only invite friends' using errcode = '42501';
    end if;
  end loop;

  perform public.coop_expire();
  if public.coop_slots_left(v_me) <= 0 then
    raise exception 'coop_limit' using errcode = 'P0001';
  end if;

  insert into public.coop_challenges (creator_id, goal, target, duration_days)
  values (v_me, p_goal, p_target, p_days)
  returning id into v_id;

  insert into public.coop_members (challenge_id, user_id, status, joined_at)
  values (v_id, v_me, 'accepted', now());
  insert into public.coop_members (challenge_id, user_id)
  select v_id, unnest(v_friends);

  select username into v_name from public.profiles where id = v_me;
  insert into public.notifications (user_id, type, title, body, data)
  select f, 'coop_invite', '🤝 Co-op challenge',
         coalesce(v_name, 'A friend') || ' invites you to a co-op challenge!',
         jsonb_build_object('route', '/coop/' || v_id)
  from unnest(v_friends) as f;

  return v_id;
end;
$$;

-- ─── Friend duels: from level 5 ───
CREATE OR REPLACE FUNCTION public.guard_duel_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $$
begin
  -- Only client writes are limited; server code (definer functions) is trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Progressive unlock (I6): challenging a friend opens at level 5.
    if not public.feature_unlocked(new.challenger_id, 'duels') then
      raise exception 'Duels unlock at level %', public.unlock_level('duels') using errcode = '42501';
    end if;
    -- Unlimited for fun, but only between friends and with an anti-spam cap
    -- (each result notifies the friend).
    if not exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = new.challenger_id and f.addressee_id = new.opponent_id)
          or (f.requester_id = new.opponent_id and f.addressee_id = new.challenger_id))
    ) then
      raise exception 'Duels are between friends' using errcode = '42501';
    end if;
    if (select count(*) from public.duels d
        where d.challenger_id = new.challenger_id and d.created_at > now() - interval '1 day') >= 20 then
      raise exception 'Too many duels today' using errcode = '42501';
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

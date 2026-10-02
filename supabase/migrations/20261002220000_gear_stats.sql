-- Shop items improve combat stats (R19, Battiste 2026-10-02; ADR 017).
--
-- Each equipped item gives points by rarity (common 1 ... legendary 5) to one
-- stat: accessory = attack, hat = defense, outfit = HP. Backgrounds and themes
-- stay cosmetic. Kept light so consistency stays what wins:
-- * friendly duels (simulated in the app, src/lib/constants/game-config.ts GEAR):
--   +3 % damage / -3 % damage taken per point, +4 HP per point;
-- * arenas (resolved here): +4 attack power per attack point, +2 defense power
--   per defense or HP point, i.e. at most +20 each with legendary items.

create or replace function public.gear_points(p_rarity text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_rarity
    when 'common' then 1 when 'uncommon' then 2 when 'rare' then 3
    when 'epic' then 4 when 'legendary' then 5 else 0 end;
$$;

-- Points of a player's equipment per stat (0 for bots and unknown players).
create or replace function public.gear_stats(p_user_id uuid)
returns table (attack integer, defense integer, hp integer)
language sql
stable
security definer set search_path = ''
as $$
  select
    coalesce(sum(public.gear_points(i.rarity)) filter (where i.category = 'avatar_accessory'), 0)::integer,
    coalesce(sum(public.gear_points(i.rarity)) filter (where i.category = 'avatar_hat'), 0)::integer,
    coalesce(sum(public.gear_points(i.rarity)) filter (where i.category = 'avatar_outfit'), 0)::integer
  from public.equipped_items e
  join public.shop_items i on i.id = e.item_id
  where e.user_id = p_user_id;
$$;

create or replace function public.arena_gear_attack(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select 4 * g.attack from public.gear_stats(p_user_id) g), 0);
$$;

create or replace function public.arena_gear_defense(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select coalesce((select 2 * (g.defense + g.hp) from public.gear_stats(p_user_id) g), 0);
$$;

revoke all on function public.gear_stats(uuid) from public, anon, authenticated;
revoke all on function public.arena_gear_attack(uuid) from public, anon, authenticated;
revoke all on function public.arena_gear_defense(uuid) from public, anon, authenticated;

-- ─── Arena fights: attack and defense include the equipment ───
CREATE OR REPLACE FUNCTION public.arena_resolve_group(p_group uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
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

      v_ap := public.arena_attack_power(v_att.habits, v_att.level, v_att.streak)
              + public.arena_gear_attack(v_att.user_id);
      v_dp := public.arena_defense_power(v_dfd.habits, v_dfd.level, v_dfd.streak)
              + public.arena_gear_defense(v_dfd.user_id);
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

-- ─── Arena screen: same powers in the preview ───
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

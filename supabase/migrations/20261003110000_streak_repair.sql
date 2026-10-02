-- Repair a broken streak within 48 hours (ADR 021, idea I2 of Battiste's
-- competitor study). A broken streak is remembered (count, time, last day
-- kept); repair_streak puts it back and covers the missed days, for gold
-- (3 per streak day, 15 to 150) or, for free players, once a day after a
-- rewarded ad.

alter table public.streaks
  add column if not exists broken_count integer not null default 0,
  add column if not exists broken_at timestamptz,
  add column if not exists broken_last_day date;
alter table public.profiles add column if not exists last_ad_repair_on date;

alter table public.streak_freezes drop constraint if exists streak_freezes_source_check;
alter table public.streak_freezes add constraint streak_freezes_source_check
  check (source = any (array['weekly', 'token', 'repair']));

create or replace function public.process_streak_breaks()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_row record;
  v_last date;
  v_missing date[];
  v_plan text[];
  v_day date;
  v_tokens integer;
  v_tokens_left integer;
  v_weeks_used date[];
  v_week date;
  i integer;
  v_broken jsonb := '[]'::jsonb;
  v_frozen jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  v_today := public.user_today(v_uid);

  for v_row in
    select s.habit_id, s.current_count, s.last_completed_at, h as habit
    from public.streaks s
    join public.habits h on h.id = s.habit_id
    where h.user_id = v_uid
      and not h.is_archived
      and not h.is_paused
      and s.current_count > 0
      and s.last_completed_at is not null
    for update of s
  loop
    v_last := public.user_local_date(v_uid, v_row.last_completed_at);
    -- Due days missed since the last completion, without a freeze (rest days
    -- of chosen-days habits and weeks that reached their target do not count).
    v_missing := public.habit_missed_days(v_uid, v_row.habit, v_last, v_today);
    if cardinality(v_missing) = 0 then
      continue;
    end if;

    -- Plan: the free weekly freeze where that week's one is unused, else a token.
    select freeze_tokens into v_tokens from public.profiles where id = v_uid for update;
    v_tokens_left := coalesce(v_tokens, 0);
    select coalesce(array_agg(distinct date_trunc('week', f.freeze_date)::date), '{}')
      into v_weeks_used
    from public.streak_freezes f
    where f.user_id = v_uid and f.source = 'weekly'
      and f.freeze_date >= date_trunc('week', v_missing[1])::date;
    v_plan := '{}';
    foreach v_day in array v_missing loop
      v_week := date_trunc('week', v_day)::date;
      if not (v_week = any (v_weeks_used)) then
        v_plan := array_append(v_plan, 'weekly');
        v_weeks_used := array_append(v_weeks_used, v_week);
      elsif v_tokens_left > 0 then
        v_plan := array_append(v_plan, 'token');
        v_tokens_left := v_tokens_left - 1;
      else
        v_plan := null;
        exit;
      end if;
    end loop;

    if v_plan is not null then
      for i in 1 .. array_length(v_missing, 1) loop
        insert into public.streak_freezes (user_id, freeze_date, source, auto)
        values (v_uid, v_missing[i], v_plan[i], true);
        v_frozen := v_frozen || to_jsonb(v_missing[i]);
      end loop;
      if v_tokens_left <> coalesce(v_tokens, 0) then
        update public.profiles set freeze_tokens = v_tokens_left where id = v_uid;
      end if;
      continue;
    end if;

    -- Remembered for 48 h so the player can repair it (ADR 021).
    update public.streaks
    set current_count = 0, broken_count = v_row.current_count, broken_at = now(), broken_last_day = v_last
    where habit_id = v_row.habit_id;
    v_broken := v_broken || jsonb_build_object('habit_id', v_row.habit_id, 'was_count', v_row.current_count);
  end loop;

  -- No penalty any more (ADR 019): a broken streak opens a comeback window
  -- in which validations earn double XP.
  if jsonb_array_length(v_broken) > 0 then
    update public.profiles set comeback_until = now() + interval '24 hours' where id = v_uid;
  end if;

  return json_build_object('broken', v_broken, 'xp_loss', 0, 'gold_loss', 0, 'auto_frozen', v_frozen,
                           'comeback_until', (select comeback_until from public.profiles where id = v_uid));
end;
$$;

create or replace function public.streak_repair_cost(p_count integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select least(greatest(3 * p_count, 15), 150);
$$;

create or replace function public.repair_streak(p_habit_id uuid, p_with_ad boolean default false)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_habit public.habits;
  v_streak public.streaks;
  v_profile public.profiles;
  v_today date;
  v_cost integer := 0;
  v_missing date[];
  v_inserted integer;
  v_today_count integer;
  v_count integer;
  i integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  select * into v_habit from public.habits where id = p_habit_id and user_id = v_uid;
  if not found then
    raise exception 'Habit not found' using errcode = 'P0002';
  end if;
  select * into v_streak from public.streaks where habit_id = p_habit_id for update;
  if v_streak.broken_count is null or v_streak.broken_count = 0
     or v_streak.broken_at is null or v_streak.broken_at < now() - interval '48 hours' then
    return json_build_object('success', false, 'reason', 'not_repairable');
  end if;

  select * into v_profile from public.profiles where id = v_uid for update;
  v_today := public.user_today(v_uid);
  if p_with_ad then
    -- Free players only (Premium has no ads), once a day.
    if private.is_premium(v_uid) then
      return json_build_object('success', false, 'reason', 'premium_no_ads');
    end if;
    if v_profile.last_ad_repair_on = v_today then
      return json_build_object('success', false, 'reason', 'ad_used_today');
    end if;
    update public.profiles set last_ad_repair_on = v_today where id = v_uid;
  else
    v_cost := public.streak_repair_cost(v_streak.broken_count);
    if v_profile.gold < v_cost then
      return json_build_object('success', false, 'reason', 'not_enough_gold', 'cost', v_cost);
    end if;
    perform public.award(v_uid, 0, -v_cost);
  end if;

  -- Cover the missed days (until nothing is missing).
  for i in 1 .. 10 loop
    v_missing := public.habit_missed_days(v_uid, v_habit, v_streak.broken_last_day, v_today);
    exit when cardinality(v_missing) = 0;
    insert into public.streak_freezes (user_id, freeze_date, source, auto)
    select v_uid, d, 'repair', true from unnest(v_missing) as d
    on conflict do nothing;
    get diagnostics v_inserted = row_count;
    exit when v_inserted = 0;
  end loop;

  -- A validation made today since the break continues the repaired streak.
  v_today_count := case when v_streak.current_count > 0
                         and public.user_local_date(v_uid, v_streak.last_completed_at) = v_today
                        then v_streak.current_count else 0 end;
  v_count := v_streak.broken_count + v_today_count;
  update public.streaks
  set current_count = v_count,
      longest_count = greatest(longest_count, v_count),
      last_completed_at = case when v_today_count > 0 then last_completed_at
                               else (select max(completed_at) from public.completions where habit_id = p_habit_id) end,
      broken_count = 0, broken_at = null, broken_last_day = null
  where habit_id = p_habit_id;
  update public.profiles set best_streak = v_count where id = v_uid and best_streak < v_count;

  return json_build_object('success', true, 'cost', v_cost, 'current_streak', v_count);
end;
$$;

revoke all on function public.repair_streak(uuid, boolean) from public, anon;
grant execute on function public.repair_streak(uuid, boolean) to authenticated;
revoke all on function public.streak_repair_cost(integer) from public, anon;
grant execute on function public.streak_repair_cost(integer) to authenticated;

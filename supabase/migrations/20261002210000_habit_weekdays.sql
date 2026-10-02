-- Habits on chosen days of the week (R15, Battiste 2026-10-02), and fair
-- streaks for "N times a week" habits.
--
-- * habits.days: ISO weekdays (1 = Monday ... 7 = Sunday) of a habit whose
--   frequency is 'days'. The habit is only due (and can only be completed)
--   on those days; the other days are rest days that never break its streak.
-- * "N times a week" habits used to break their streak (with the XP/gold
--   penalty) on the first day without a completion, although skipping days
--   is the point. Their streak now only breaks when a whole week ended below
--   its target (prorated in the week the habit was created).
-- * habit_missed_days() is the single rule: the due days missed since the
--   last completion, without a freeze. Empty = the streak is alive. Used by
--   complete_habit and process_streak_breaks (whose automatic freezes cover
--   exactly those days).
-- * Daily quests: only the habits due today count (feasibility of the
--   templates, "complete all your habits").

alter table public.habits add column if not exists days smallint[];

alter table public.habits drop constraint if exists habits_frequency_check;
alter table public.habits add constraint habits_frequency_check check (
  frequency in ('daily', '2x_week', '3x_week', '4x_week', '5x_week', 'days')
  and (frequency = 'days') = (days is not null)
  and (days is null or (cardinality(days) between 1 and 6 and days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]))
);

-- Is the habit due on that local day? Weekly habits can be done any day.
create or replace function public.habit_due_on(p_habit public.habits, p_day date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_habit.frequency <> 'days' or extract(isodow from p_day)::smallint = any (p_habit.days);
$$;

-- Due days missed between the last completion (p_last) and today, without a
-- freeze. Empty when the streak is alive.
create or replace function public.habit_missed_days(p_user_id uuid, p_habit public.habits, p_last date, p_today date)
returns date[]
language plpgsql
stable
security definer set search_path = ''
as $$
declare
  v_target integer;
  v_created date;
  v_week date;
  v_required integer;
  v_done integer;
  v_missed date[] := '{}';
begin
  if p_last is null or p_last >= p_today - 1 then
    return '{}';
  end if;

  if p_habit.frequency not like '%x_week' then
    select coalesce(array_agg(d::date order by d), '{}') into v_missed
    from generate_series(p_last + 1, p_today - 1, interval '1 day') as d
    where public.habit_due_on(p_habit, d::date)
      and not exists (select 1 from public.streak_freezes f
                      where f.user_id = p_user_id and f.freeze_date = d::date);
    return v_missed;
  end if;

  -- N times a week: every week that ended since the last completion's week
  -- must have reached its target; a frozen day counts as a done day.
  v_target := public.weekly_target(p_habit.frequency);
  v_created := public.user_local_date(p_user_id, p_habit.created_at);
  v_week := date_trunc('week', p_last)::date;
  while v_week + 6 < p_today loop
    v_required := least(v_target, (v_week + 6) - greatest(v_week, v_created) + 1);
    select count(*) into v_done
    from generate_series(v_week, v_week + 6, interval '1 day') as d
    where exists (select 1 from public.completions c
                  where c.habit_id = p_habit.id and public.user_local_date(p_user_id, c.completed_at) = d::date)
       or exists (select 1 from public.streak_freezes f
                  where f.user_id = p_user_id and f.freeze_date = d::date);
    if v_done < v_required then
      -- The latest free days of that week would cover the shortfall.
      v_missed := v_missed || array(
        select d::date
        from generate_series(v_week, v_week + 6, interval '1 day') as d
        where d::date >= v_created
          and not exists (select 1 from public.completions c
                          where c.habit_id = p_habit.id and public.user_local_date(p_user_id, c.completed_at) = d::date)
          and not exists (select 1 from public.streak_freezes f
                          where f.user_id = p_user_id and f.freeze_date = d::date)
        order by d desc
        limit v_required - v_done);
    end if;
    v_week := v_week + 7;
  end loop;
  return array(select unnest(v_missed) order by 1);
end;
$$;

revoke all on function public.habit_missed_days(uuid, public.habits, date, date) from public, anon, authenticated;

-- ─── complete_habit: rest days, and the shared streak rule ───
CREATE OR REPLACE FUNCTION public.complete_habit(p_habit_id uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $$
declare
  v_uid uuid := auth.uid();
  v_habit public.habits;
  v_streak public.streaks;
  v_today date;
  v_week_start date;
  v_done integer;
  v_last date;
  v_count integer;
  v_longest integer;
  v_xp integer;
  v_gold integer;
  v_levels record;
  v_level_before integer;
  v_challenge public.challenges;
  v_progress integer;
  v_other integer;
  v_loser uuid;
  v_all_done boolean;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select * into v_habit from public.habits
  where id = p_habit_id and user_id = v_uid
  for update;
  if not found then
    raise exception 'Habit not found' using errcode = 'P0002';
  end if;
  if v_habit.is_archived or v_habit.is_paused then
    return json_build_object('success', false, 'reason', 'inactive');
  end if;

  v_today := public.user_today(v_uid);
  v_week_start := date_trunc('week', v_today)::date;

  -- Chosen days: only on those days.
  if not public.habit_due_on(v_habit, v_today) then
    return json_build_object('success', false, 'reason', 'not_scheduled');
  end if;

  -- Daily and chosen-days habits: once per local day. Weekly habits: up to their weekly target.
  if v_habit.frequency in ('daily', 'days') then
    select count(*) into v_done from public.completions
    where habit_id = p_habit_id
      and public.user_local_date(v_uid, completed_at) = v_today;
  else
    select count(*) into v_done from public.completions
    where habit_id = p_habit_id
      and public.user_local_date(v_uid, completed_at) >= v_week_start;
  end if;
  if v_done >= public.weekly_target(v_habit.frequency) then
    return json_build_object('success', false, 'reason', 'already_completed');
  end if;
  -- "N times a week" means N different days: one validation per local day.
  if v_habit.frequency like '%x_week' and exists (
    select 1 from public.completions
    where habit_id = p_habit_id
      and public.user_local_date(v_uid, completed_at) = v_today) then
    return json_build_object('success', false, 'reason', 'already_completed');
  end if;

  -- Streak: continues when no due day was missed since the last completion
  -- (habit_missed_days: frozen days and rest days do not count).
  insert into public.streaks (habit_id) values (p_habit_id) on conflict (habit_id) do nothing;
  select * into v_streak from public.streaks where habit_id = p_habit_id for update;

  v_last := case when v_streak.last_completed_at is null then null
                 else public.user_local_date(v_uid, v_streak.last_completed_at) end;
  if v_last = v_today then
    v_count := v_streak.current_count;
  elsif v_last is not null and v_last < v_today
        and cardinality(public.habit_missed_days(v_uid, v_habit, v_last, v_today)) = 0 then
    v_count := v_streak.current_count + 1;
  else
    v_count := 1;
  end if;
  v_longest := greatest(v_streak.longest_count, v_count);

  -- Rewards (mirror calculateXpEarned / calculateGoldEarned)
  v_xp := round(10 * least(1 + v_count * 0.1, 5))::integer;
  v_gold := floor(v_xp * 0.1)::integer;

  -- Read before the completion: a co-op reward granted by its trigger could
  -- otherwise raise the level first and hide the level-up from the app.
  select level into v_level_before from public.profiles where id = v_uid;

  insert into public.completions (habit_id, xp_earned, note)
  values (p_habit_id, v_xp, nullif(left(trim(p_note), 500), ''));

  update public.streaks
  set current_count = v_count, longest_count = v_longest, last_completed_at = now()
  where habit_id = p_habit_id;

  select * into v_levels from public.award(v_uid, v_xp, v_gold);

  update public.profiles set best_streak = v_longest
  where id = v_uid and best_streak < v_longest;

  -- Active challenges progress
  for v_challenge in
    select * from public.challenges
    where status = 'active' and (creator_id = v_uid or opponent_id = v_uid)
      and (ends_at is null or ends_at > now())
    for update
  loop
    v_progress := case when v_challenge.creator_id = v_uid
                       then v_challenge.creator_progress else v_challenge.opponent_progress end
                  + case when v_challenge.type = 'xp_race' then v_xp else 1 end;
    v_other := case when v_challenge.creator_id = v_uid
                    then v_challenge.opponent_progress else v_challenge.creator_progress end;

    if v_challenge.creator_id = v_uid then
      update public.challenges set creator_progress = v_progress where id = v_challenge.id;
    else
      update public.challenges set opponent_progress = v_progress where id = v_challenge.id;
    end if;

    if v_progress >= v_challenge.target and v_other < v_challenge.target then
      v_loser := case when v_challenge.creator_id = v_uid
                      then v_challenge.opponent_id else v_challenge.creator_id end;

      update public.challenges
      set status = 'completed', winner_id = v_uid, wager_settled = true
      where id = v_challenge.id;

      if v_challenge.gold_wager > 0 and not v_challenge.wager_settled then
        perform public.award(v_uid, 0, v_challenge.gold_wager);
        perform public.award(v_loser, 0, -v_challenge.gold_wager);
      end if;

      insert into public.notifications (user_id, type, title, body, data) values
        (v_uid, 'challenge_completed', '🏆 Challenge Won!',
         'You won the challenge and earned ' || v_challenge.gold_wager || 'g!',
         jsonb_build_object('route', '/(tabs)/social', 'challengeId', v_challenge.id)),
        (v_loser, 'challenge_completed', '⚔️ Challenge Lost',
         'Your opponent won the challenge.'
           || case when v_challenge.gold_wager > 0
                   then ' You lost ' || v_challenge.gold_wager || 'g.' else '' end,
         jsonb_build_object('route', '/(tabs)/social', 'challengeId', v_challenge.id));
    end if;
  end loop;

  -- Daily quests progress
  select bool_and(exists (
           select 1 from public.completions c
           where c.habit_id = h.id and public.user_local_date(v_uid, c.completed_at) = v_today))
  into v_all_done
  from public.habits h
  where h.user_id = v_uid and not h.is_archived and not h.is_paused
    and public.habit_due_on(h, v_today);

  update public.user_daily_quests q
  set current_progress = case t.quest_type
        when 'complete_habits' then q.current_progress + 1
        when 'complete_category' then q.current_progress
          + case when t.target_category = v_habit.category then 1 else 0 end
        when 'earn_xp' then q.current_progress + v_xp
        when 'maintain_streak' then case when coalesce(v_all_done, false) then 1 else 0 end
        else q.current_progress
      end
  from public.daily_quest_templates t
  where t.id = q.template_id
    and q.user_id = v_uid
    and q.assigned_date = v_today
    and not q.is_completed;

  update public.user_daily_quests q
  set is_completed = true, completed_at = now()
  from public.daily_quest_templates t
  where t.id = q.template_id
    and q.user_id = v_uid
    and q.assigned_date = v_today
    and not q.is_completed
    and q.current_progress >= t.target_value;

  return json_build_object(
    'success', true,
    'xp_earned', v_xp,
    'gold_earned', v_gold,
    'old_level', least(v_level_before, v_levels.old_level),
    'new_level', v_levels.new_level,
    'current_streak', v_count,
    'longest_streak', v_longest,
    'previous_streak', v_streak.current_count
  );
end;
$$;

-- ─── process_streak_breaks: the shared streak rule ───
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
  v_xp_loss integer := 0;
  v_gold_loss integer := 0;
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

    update public.streaks set current_count = 0 where habit_id = v_row.habit_id;
    v_xp_loss := v_xp_loss + least(v_row.current_count * 2, 100);
    v_gold_loss := v_gold_loss + least(v_row.current_count, 50);
    v_broken := v_broken || jsonb_build_object('habit_id', v_row.habit_id, 'was_count', v_row.current_count);
  end loop;

  if v_xp_loss > 0 or v_gold_loss > 0 then
    perform public.award(v_uid, -v_xp_loss, -v_gold_loss);
  end if;

  return json_build_object('broken', v_broken, 'xp_loss', v_xp_loss, 'gold_loss', v_gold_loss,
                           'auto_frozen', v_frozen);
end;
$$;

-- ─── Daily quests: only the habits due today ───
create or replace function public.feasible_quest_templates(p_user_id uuid)
returns setof public.daily_quest_templates
language sql
stable
security definer set search_path = ''
as $$
  with active as (
    select h.category, coalesce(s.current_count, 0) as streak
    from public.habits h
    left join public.streaks s on s.habit_id = h.id
    where h.user_id = p_user_id and not h.is_archived and not h.is_paused
      and public.habit_due_on(h, public.user_today(p_user_id))
  ), stats as (
    select count(*)::int as n,
           coalesce(sum(round(10 * least(1 + (streak + 1) * 0.1, 5))), 0)::int as max_xp
    from active
  )
  select t.*
  from public.daily_quest_templates t, stats
  where t.is_active
    and stats.n > 0
    and case t.quest_type
      when 'complete_habits' then t.target_value <= stats.n
      when 'complete_category' then exists (select 1 from active a where a.category = t.target_category)
      when 'earn_xp' then t.target_value <= stats.max_xp
      else true
    end;
$$;

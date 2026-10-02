-- Comeback bonus instead of a penalty (ADR 019, Battiste 2026-10-02).
-- A broken streak no longer costs XP or gold: research on habit apps shows
-- that punishment makes people quit after a miss. Instead, the 24 hours
-- after a break are a comeback window where every validation earns double
-- XP (and the gold that goes with it), to reward getting back on track.

alter table public.profiles add column if not exists comeback_until timestamptz;

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

    update public.streaks set current_count = 0 where habit_id = v_row.habit_id;
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
  v_comeback boolean := false;
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
  -- Comeback window after a broken streak (ADR 019): double XP.
  if exists (select 1 from public.profiles where id = v_uid and comeback_until > now()) then
    v_xp := v_xp * 2;
    v_comeback := true;
  end if;
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
    'previous_streak', v_streak.current_count,
    'comeback', v_comeback
  );
end;
$$;

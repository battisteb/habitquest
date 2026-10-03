-- Mini version of a quest (G1, ADR 027): on a hard day the player can do
-- the small version ("read 1 page") and keep the streak, for half the XP.
-- complete_habit gains p_mini; the rest of its body is unchanged (copied from
-- the definition after 20261003100000_comeback_bonus).
--
-- The signature changes: later migrations must redefine
-- complete_habit(uuid, text, boolean), never (uuid, text) again, or two
-- overloads would exist (checked by supabase/tests/mini-quest.test.sql).

alter table public.habits
  add column if not exists mini text;
alter table public.habits
  drop constraint if exists habits_mini_length,
  add constraint habits_mini_length check (mini is null or char_length(mini) between 1 and 60);

alter table public.completions
  add column if not exists is_mini boolean not null default false;

drop function if exists public.complete_habit(uuid, text);

create function public.complete_habit(p_habit_id uuid, p_note text default null, p_mini boolean default false)
returns json
language plpgsql
security definer
set search_path = ''
as $function$
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
  -- Mini version (G1, ADR 027): only for a quest that defines one.
  if p_mini and v_habit.mini is null then
    return json_build_object('success', false, 'reason', 'no_mini');
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
  -- Mini version: the streak goes on, for half the XP (MINI.XP_FACTOR).
  if p_mini then
    v_xp := greatest(1, round(v_xp * 0.5))::integer;
  end if;
  -- Comeback window after a broken streak (ADR 019): double XP.
  if exists (select 1 from public.profiles where id = v_uid and comeback_until > now()) then
    v_xp := v_xp * 2;
    v_comeback := true;
  end if;
  v_gold := floor(v_xp * 0.1)::integer;

  -- Read before the completion: a co-op reward granted by its trigger could
  -- otherwise raise the level first and hide the level-up from the app.
  select level into v_level_before from public.profiles where id = v_uid;

  insert into public.completions (habit_id, xp_earned, note, is_mini)
  values (p_habit_id, v_xp, nullif(left(trim(p_note), 500), ''), p_mini);

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
    'comeback', v_comeback,
    'mini', p_mini
  );
end;
$function$;

revoke all on function public.complete_habit(uuid, text, boolean) from public, anon;
grant execute on function public.complete_habit(uuid, text, boolean) to authenticated;

-- Social review (docs/review/2026-10-revue-app.md), 1v1 challenges:
-- 1. The chosen length (3, 7, 14 days) was never enforced: a challenge ran
--    until someone hit the target, forever if nobody did, and the end date
--    came from the app. The clock now starts on acceptance, validations stop
--    counting at the end, and settle_expired_challenges() closes it: the
--    better progress wins the wager, a tie moves no gold.
-- 2. The losing side could cancel an active challenge to keep its wager:
--    only pending challenges can be cancelled now.
-- 3. A challenge could target yourself or a stranger: friends only.

CREATE OR REPLACE FUNCTION public.guard_challenge_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.gold_wager < 0 or new.gold_wager > 100 or new.target <= 0 then
      raise exception 'Invalid challenge' using errcode = '22023';
    end if;
    if new.opponent_id = new.creator_id then
      raise exception 'You cannot challenge yourself' using errcode = '22023';
    end if;
    if not exists (select 1 from public.friendships
                   where status = 'accepted'
                     and ((requester_id = new.creator_id and addressee_id = new.opponent_id)
                       or (requester_id = new.opponent_id and addressee_id = new.creator_id))) then
      raise exception 'You can only challenge a friend' using errcode = '42501';
    end if;
    -- The app sends the chosen length (3, 7 or 14 days); the clock starts on acceptance.
    if new.ends_at is null or new.starts_at is null
       or new.ends_at - new.starts_at not between interval '1 day' and interval '14 days 1 hour' then
      new.starts_at := now();
      new.ends_at := now() + interval '7 days';
    end if;
    new.creator_progress := 0;
    new.opponent_progress := 0;
    new.status := 'pending';
    new.winner_id := null;
    new.wager_settled := false;
    return new;
  end if;

  if (new.creator_id, new.opponent_id, new.type, new.target, new.gold_wager,
      new.creator_progress, new.opponent_progress, new.winner_id, new.wager_settled,
      new.starts_at, new.ends_at)
     is distinct from
     (old.creator_id, old.opponent_id, old.type, old.target, old.gold_wager,
      old.creator_progress, old.opponent_progress, old.winner_id, old.wager_settled,
      old.starts_at, old.ends_at) then
    raise exception 'Only the challenge status can be changed' using errcode = '42501';
  end if;

  if new.status is distinct from old.status and not (
       (old.status = 'pending' and new.status = 'active' and auth.uid() = old.opponent_id)
    -- Once accepted, a challenge runs to its end: no cancelling a losing one.
    or (old.status = 'pending' and new.status = 'cancelled')
  ) then
    raise exception 'Invalid challenge status change' using errcode = '42501';
  end if;
  if old.status = 'pending' and new.status = 'active' then
    new.starts_at := now();
    new.ends_at := now() + (old.ends_at - old.starts_at);
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.complete_habit(p_habit_id uuid, p_note text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- Daily habits: once per local day. Weekly habits: up to their weekly target.
  if v_habit.frequency = 'daily' then
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
  if v_habit.frequency <> 'daily' and exists (
    select 1 from public.completions
    where habit_id = p_habit_id
      and public.user_local_date(v_uid, completed_at) = v_today) then
    return json_build_object('success', false, 'reason', 'already_completed');
  end if;

  -- Streak (mirrors calculateNewStreak, plus freezes)
  insert into public.streaks (habit_id) values (p_habit_id) on conflict (habit_id) do nothing;
  select * into v_streak from public.streaks where habit_id = p_habit_id for update;

  v_last := case when v_streak.last_completed_at is null then null
                 else public.user_local_date(v_uid, v_streak.last_completed_at) end;
  if v_last = v_today then
    v_count := v_streak.current_count;
  elsif public.streak_continues(v_uid, v_last, v_today) then
    v_count := v_streak.current_count + 1;
  else
    v_count := 1;
  end if;
  v_longest := greatest(v_streak.longest_count, v_count);

  -- Rewards (mirror calculateXpEarned / calculateGoldEarned)
  v_xp := round(10 * least(1 + v_count * 0.1, 5))::integer;
  v_gold := floor(v_xp * 0.1)::integer;

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
  where h.user_id = v_uid and not h.is_archived and not h.is_paused;

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
    'old_level', v_levels.old_level,
    'new_level', v_levels.new_level,
    'current_streak', v_count,
    'longest_streak', v_longest,
    'previous_streak', v_streak.current_count
  );
end;
$function$;

create or replace function public.settle_expired_challenges()
returns integer
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_challenge public.challenges;
  v_winner uuid;
  v_loser uuid;
  v_count integer := 0;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  for v_challenge in
    select * from public.challenges
    where status = 'active' and ends_at <= now() and v_me in (creator_id, opponent_id)
    for update
  loop
    v_winner := case
      when v_challenge.creator_progress > v_challenge.opponent_progress then v_challenge.creator_id
      when v_challenge.opponent_progress > v_challenge.creator_progress then v_challenge.opponent_id
    end;
    v_loser := case when v_winner = v_challenge.creator_id then v_challenge.opponent_id
                    when v_winner = v_challenge.opponent_id then v_challenge.creator_id end;

    update public.challenges set status = 'completed', winner_id = v_winner, wager_settled = true
    where id = v_challenge.id;

    if v_winner is not null and v_challenge.gold_wager > 0 and not v_challenge.wager_settled then
      perform public.award(v_winner, 0, v_challenge.gold_wager);
      perform public.award(v_loser, 0, -v_challenge.gold_wager);
    end if;

    if v_winner is null then
      insert into public.notifications (user_id, type, title, body, data)
      select u, 'challenge_completed', '🤝 Challenge Over', 'Time is up: it is a draw.',
             jsonb_build_object('route', '/(tabs)/social', 'challengeId', v_challenge.id)
      from unnest(array[v_challenge.creator_id, v_challenge.opponent_id]) as u;
    else
      insert into public.notifications (user_id, type, title, body, data) values
        (v_winner, 'challenge_completed', '🏆 Challenge Won!',
         'Time is up and you were ahead' || case when v_challenge.gold_wager > 0
           then ': +' || v_challenge.gold_wager || 'g!' else '!' end,
         jsonb_build_object('route', '/(tabs)/social', 'challengeId', v_challenge.id)),
        (v_loser, 'challenge_completed', '⚔️ Challenge Lost',
         'Time is up and your opponent was ahead.' || case when v_challenge.gold_wager > 0
           then ' You lost ' || v_challenge.gold_wager || 'g.' else '' end,
         jsonb_build_object('route', '/(tabs)/social', 'challengeId', v_challenge.id));
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.settle_expired_challenges() from public, anon;
grant execute on function public.settle_expired_challenges() to authenticated;

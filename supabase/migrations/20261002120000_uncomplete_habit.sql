-- Undo a quest validated by mistake (Battiste, 2026-10-02).
-- Only today's validation can be undone, and everything it gave is taken
-- back, so checking and unchecking can never earn anything:
-- - XP and gold of the validation (the level can go back down);
-- - the streak goes back to where it was (the record is kept);
-- - progress of active 1v1 challenges and co-op challenges;
-- - daily missions it counted for, including a reward already claimed.
-- A challenge won or a co-op completed by it stays won (it was announced to
-- the other players).

create or replace function public.uncomplete_habit(p_habit_id uuid)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_habit public.habits;
  v_today date;
  v_done public.completions;
  v_xp integer;
  v_gold integer;
  v_levels record;
  v_count integer;
  v_quest record;
  v_quest_xp integer := 0;
  v_quest_gold integer := 0;
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

  v_today := public.user_today(v_uid);
  select * into v_done from public.completions
  where habit_id = p_habit_id and public.user_local_date(v_uid, completed_at) = v_today
  order by completed_at desc
  limit 1
  for update;
  if not found then
    return json_build_object('success', false, 'reason', 'not_completed_today');
  end if;

  v_xp := v_done.xp_earned;
  v_gold := floor(v_xp * 0.1)::integer;

  -- Daily missions it counted for (not completed yet, or completed by it).
  for v_quest in
    select q.id, q.current_progress, q.is_claimed, t.quest_type, t.target_category,
           t.target_value, t.xp_reward, t.gold_reward
    from public.user_daily_quests q
    join public.daily_quest_templates t on t.id = q.template_id
    where q.user_id = v_uid and q.assigned_date = v_today
      and (not q.is_completed or q.completed_at >= v_done.completed_at)
    for update of q
  loop
    v_count := greatest(0, v_quest.current_progress - case v_quest.quest_type
      when 'complete_habits' then 1
      when 'complete_category' then case when v_quest.target_category = v_habit.category then 1 else 0 end
      when 'earn_xp' then v_xp
      when 'maintain_streak' then v_quest.current_progress -- not every habit is done any more
      else 0
    end);
    if v_count < v_quest.target_value then
      if v_quest.is_claimed then
        v_quest_xp := v_quest_xp + v_quest.xp_reward;
        v_quest_gold := v_quest_gold + v_quest.gold_reward;
      end if;
      update public.user_daily_quests
      set current_progress = v_count, is_completed = false, completed_at = null,
          is_claimed = false, claimed_at = null
      where id = v_quest.id;
    else
      update public.user_daily_quests set current_progress = v_count where id = v_quest.id;
    end if;
  end loop;

  delete from public.completions where id = v_done.id;

  -- Streak: one day less, last validation back to the previous one.
  update public.streaks
  set current_count = greatest(current_count - 1, 0),
      last_completed_at = (select max(completed_at) from public.completions where habit_id = p_habit_id)
  where habit_id = p_habit_id
  returning current_count into v_count;

  -- Active 1v1 challenges.
  update public.challenges
  set creator_progress = case when creator_id = v_uid
        then greatest(0, creator_progress - case when type = 'xp_race' then v_xp else 1 end)
        else creator_progress end,
      opponent_progress = case when opponent_id = v_uid
        then greatest(0, opponent_progress - case when type = 'xp_race' then v_xp else 1 end)
        else opponent_progress end
  where status = 'active' and (creator_id = v_uid or opponent_id = v_uid);

  -- Active co-op challenges.
  update public.coop_challenges c
  set progress = greatest(0, c.progress - case when c.goal = 'validations' then 1 else v_xp end)
  from public.coop_members m
  where m.challenge_id = c.id and m.user_id = v_uid and m.status = 'accepted' and c.status = 'active';
  update public.coop_members m
  set validations = greatest(0, m.validations - 1), xp = greatest(0, m.xp - v_xp)
  from public.coop_challenges c
  where c.id = m.challenge_id and m.user_id = v_uid and m.status = 'accepted' and c.status = 'active';

  select * into v_levels from public.award(v_uid, -(v_xp + v_quest_xp), -(v_gold + v_quest_gold));

  return json_build_object(
    'success', true,
    'xp_lost', v_xp + v_quest_xp,
    'gold_lost', v_gold + v_quest_gold,
    'old_level', v_levels.old_level,
    'new_level', v_levels.new_level,
    'current_streak', coalesce(v_count, 0)
  );
end;
$$;

revoke all on function public.uncomplete_habit(uuid) from public, anon;
grant execute on function public.uncomplete_habit(uuid) to authenticated;

-- Daily quests the player can actually complete. They were drawn at random:
-- a new player with one "health" habit got "Complete a learning habit" and
-- "Earn 100 XP today" (11 XP possible) — guaranteed failure on day one.
-- See docs/adr/010-ux-review-fixes.md.

-- Category quests for every habit category (only fitness/health/learning existed).
insert into public.daily_quest_templates
  (title, description, quest_type, target_value, target_category, xp_reward, gold_reward, difficulty)
select v.* from (values
  ('Inner Peace', 'Complete a mindfulness habit', 'complete_category', 1, 'mindfulness', 25, 5, 'normal'),
  ('Getting Things Done', 'Complete a productivity habit', 'complete_category', 1, 'productivity', 25, 5, 'normal'),
  ('Eat Well', 'Complete a nutrition habit', 'complete_category', 1, 'nutrition', 25, 5, 'normal'),
  ('Well Rested', 'Complete a sleep habit', 'complete_category', 1, 'sleep', 25, 5, 'normal'),
  ('Creative Spark', 'Complete a creativity habit', 'complete_category', 1, 'creativity', 25, 5, 'normal'),
  ('Good Company', 'Complete a social habit', 'complete_category', 1, 'social', 25, 5, 'normal')
) as v(title, description, quest_type, target_value, target_category, xp_reward, gold_reward, difficulty)
where not exists (select 1 from public.daily_quest_templates t where t.title = v.title);

-- Only quests completable today with the player's current habits:
--   complete_habits  → target ≤ number of active habits
--   complete_category → the player has an active habit in that category
--   earn_xp          → target ≤ XP of completing every active habit today
--   maintain_streak  → at least one active habit
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

revoke all on function public.feasible_quest_templates(uuid) from public, anon, authenticated;

create or replace function public.assign_daily_quests(p_user_id uuid)
returns setof public.user_daily_quests
language plpgsql
security definer set search_path = ''
as $$
declare
  v_today date;
  v_difficulty text;
  v_template uuid;
begin
  perform public.assert_caller_is(p_user_id);
  v_today := public.user_today(p_user_id);

  if not exists (
    select 1 from public.user_daily_quests where user_id = p_user_id and assigned_date = v_today
  ) then
    foreach v_difficulty in array array['easy', 'normal', 'hard'] loop
      -- A feasible quest of this difficulty, else the easiest feasible one left.
      select f.id into v_template
      from public.feasible_quest_templates(p_user_id) f
      where not exists (
        select 1 from public.user_daily_quests q
        where q.user_id = p_user_id and q.assigned_date = v_today and q.template_id = f.id
      )
      order by (f.difficulty = v_difficulty) desc,
               array_position(array['easy', 'normal', 'hard'], f.difficulty),
               random()
      limit 1;

      if v_template is not null then
        insert into public.user_daily_quests (user_id, template_id, assigned_date)
        values (p_user_id, v_template, v_today)
        on conflict do nothing;
      end if;
    end loop;
  end if;

  return query
    select * from public.user_daily_quests
    where user_id = p_user_id and assigned_date = v_today;
end;
$$;

-- Achievements review (docs/review/2026-10-revue-app.md):
-- 1. The app decided which achievements were earned and inserted them itself,
--    so anyone could grant themselves every achievement and its XP/gold
--    (known limit of ADR 008).
-- 2. Every "social" achievement used the friend count: one friend unlocked
--    "Challenger" (launch a challenge) and "Victor" (win one).
-- Progress and unlocks are now computed here. Rewards still come from the
-- on_achievement_unlocked_reward trigger, once per achievement.

create or replace function public.achievement_value(p_user_id uuid, p_key text, p_category text)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select case
    when p_key like 'level\_%' then (select level from public.profiles where id = p_user_id)
    when p_key = 'challenge_1' then
      (select count(*) from public.challenges where creator_id = p_user_id)::integer
    when p_key = 'challenge_win_1' then
      (select count(*) from public.challenges where winner_id = p_user_id)::integer
    when p_key like 'friend\_%' then
      (select count(*) from public.friendships
       where status = 'accepted' and p_user_id in (requester_id, addressee_id))::integer
    when p_key = 'equip_full' then
      (select count(*) from public.equipped_items where user_id = p_user_id)::integer
    when p_category = 'shop' then
      (select count(*) from public.purchases where user_id = p_user_id)::integer
    when p_category = 'completion' then
      (select count(*) from public.completions c join public.habits h on h.id = c.habit_id
       where h.user_id = p_user_id)::integer
    when p_category = 'streak' then
      (select coalesce(max(greatest(s.current_count, s.longest_count)), 0)
       from public.streaks s join public.habits h on h.id = s.habit_id
       where h.user_id = p_user_id)
    when p_category = 'xp' then (select xp from public.profiles where id = p_user_id)
    else 0
  end;
$$;

revoke all on function public.achievement_value(uuid, text, text) from public, anon, authenticated;

-- Unlocks what the caller has earned and returns every achievement with its
-- progress; `new` lists the ones unlocked by this call (for the toast).
create or replace function public.check_achievements()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_new uuid[];
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  with earned as (
    insert into public.user_achievements (user_id, achievement_id)
    select v_me, a.id from public.achievements a
    where not exists (select 1 from public.user_achievements ua
                      where ua.user_id = v_me and ua.achievement_id = a.id)
      and coalesce(public.achievement_value(v_me, a.key, a.category), 0) >= a.threshold
    returning achievement_id
  )
  select coalesce(array_agg(achievement_id), '{}') into v_new from earned;

  return json_build_object(
    'new', to_json(v_new),
    'achievements', (
      select coalesce(json_agg(json_build_object(
          'id', a.id, 'key', a.key, 'name', a.name, 'description', a.description,
          'category', a.category, 'icon', a.icon, 'threshold', a.threshold,
          'xp_reward', a.xp_reward, 'gold_reward', a.gold_reward, 'created_at', a.created_at,
          'is_unlocked', ua.user_id is not null, 'unlocked_at', ua.unlocked_at,
          'current_value', least(coalesce(public.achievement_value(v_me, a.key, a.category), 0), a.threshold))
        order by a.category, a.threshold), '[]'::json)
      from public.achievements a
      left join public.user_achievements ua on ua.achievement_id = a.id and ua.user_id = v_me));
end;
$$;

revoke all on function public.check_achievements() from public, anon;
grant execute on function public.check_achievements() to authenticated;

-- Unlocks only go through check_achievements().
drop policy if exists "System can insert achievements" on public.user_achievements;
revoke insert, update, delete on public.user_achievements from authenticated, anon;

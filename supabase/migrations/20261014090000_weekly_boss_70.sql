-- Weekly boss at 70 % (ADR 031, Battiste 2026-10-14): its HP go from 8 to 7 per validation planned
-- this week, so about 70 % of the week's quests beat it instead of 80 %. The economy simulation
-- showed a player who skips the weekend (71 %) never won and a player at 80 % only 5 weeks in 8.

create or replace function public.refresh_weekly_boss(p_user_id uuid)
returns public.weekly_boss_runs
language plpgsql
security definer set search_path = ''
as $$
declare
  v_week date := date_trunc('week', public.user_today(p_user_id))::date;
  v_run public.weekly_boss_runs;
  v_damage integer;
  v_lang text;
begin
  insert into public.weekly_boss_runs (user_id, week_start, boss_key, hp_max)
  values (p_user_id, v_week, public.weekly_boss_key(v_week),
          7 * greatest(public.weekly_planned_validations(p_user_id), 5))
  on conflict (user_id, week_start) do nothing;

  select * into v_run from public.weekly_boss_runs
  where user_id = p_user_id and week_start = v_week for update;
  if v_run.defeated_at is not null then
    return v_run;
  end if;

  select 10 * count(*) into v_damage
  from public.completions c
  join public.habits h on h.id = c.habit_id
  where h.user_id = p_user_id
    and public.user_local_date(p_user_id, c.completed_at) between v_week and v_week + 6;

  update public.weekly_boss_runs
  set damage = least(v_damage, hp_max),
      defeated_at = case when v_damage >= hp_max then now() end
  where user_id = p_user_id and week_start = v_week
  returning * into v_run;

  if v_run.defeated_at is not null then
    perform public.award(p_user_id, 50, 25);
    select language into v_lang from public.profiles where id = p_user_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (p_user_id, 'boss_defeated',
            case when v_lang = 'fr' then '⚔️ Boss vaincu !' else '⚔️ Boss defeated!' end,
            case when v_lang = 'fr' then 'Tes quêtes de la semaine en sont venues à bout : +50 XP, +25 or.'
                 else 'Your quests of the week took it down: +50 XP, +25 gold.' end,
            jsonb_build_object('route', '/(tabs)/today'));
  end if;
  return v_run;
end;
$$;

-- This week's bosses not yet beaten get the new HP (HP were 8 × planned validations); they fall at
-- the player's next validation or visit if the damage already done is enough.
update public.weekly_boss_runs
set hp_max = hp_max / 8 * 7
where defeated_at is null
  and week_start >= date_trunc('week', now() - interval '1 day')::date;

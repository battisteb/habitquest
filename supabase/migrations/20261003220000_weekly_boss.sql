-- Weekly boss (I9, Battiste 2026-10-02; ADR 022). Each week a bad habit
-- in monster form (the Snooze Golem, the Doomscroll Kraken...) stands in the
-- player's way. Every validated quest of the week hits it for 10; its HP is
-- 8 per quest planned that week, so about 80 % of the week defeats it.
-- Defeating it pays once: +50 XP, +25 gold. Mirrors BOSS in
-- src/lib/constants/game-config.ts — change both together.

create table if not exists public.weekly_boss_runs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  boss_key text not null,
  hp_max integer not null check (hp_max > 0),
  damage integer not null default 0 check (damage >= 0),
  defeated_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (user_id, week_start)
);

alter table public.weekly_boss_runs enable row level security;
drop policy if exists "players read their own boss" on public.weekly_boss_runs;
create policy "players read their own boss" on public.weekly_boss_runs
  for select to authenticated using (user_id = auth.uid());
revoke all on public.weekly_boss_runs from anon, authenticated;
grant select on public.weekly_boss_runs to authenticated;

-- The boss of a week, in rotation (the app has their names, stories and sprites).
create or replace function public.weekly_boss_key(p_week_start date)
returns text
language sql
immutable
set search_path = ''
as $$
  select (array['snooze_golem', 'doomscroll_kraken', 'couch_troll', 'junk_goblin'])
    [((p_week_start - date '2026-01-05') / 7 % 4 + 4) % 4 + 1];
$$;

-- Validations a player's quests plan for a whole week.
create or replace function public.weekly_planned_validations(p_user_id uuid)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select coalesce(sum(case
    when h.frequency = 'days' then cardinality(h.days)
    when h.frequency like '%x_week' then public.weekly_target(h.frequency)
    else 7 end), 0)::integer
  from public.habits h
  where h.user_id = p_user_id and not h.is_archived and not h.is_paused;
$$;

-- Creates the player's run for the current week if needed, recounts its
-- damage from the week's validations, and pays the reward on defeat.
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
          8 * greatest(public.weekly_planned_validations(p_user_id), 5))
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

revoke all on function public.refresh_weekly_boss(uuid) from public, anon, authenticated;

-- The current week's boss of the signed-in player.
create or replace function public.get_weekly_boss()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
  v_run public.weekly_boss_runs;
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  v_run := public.refresh_weekly_boss(v_me);
  return json_build_object(
    'week_start', v_run.week_start,
    'ends_on', v_run.week_start + 6,
    'boss_key', v_run.boss_key,
    'hp_max', v_run.hp_max,
    'damage', v_run.damage,
    'defeated', v_run.defeated_at is not null,
    'reward_xp', 50,
    'reward_gold', 25);
end;
$$;

revoke all on function public.get_weekly_boss() from public, anon;
grant execute on function public.get_weekly_boss() to authenticated;

-- Every validation (or un-validation) of the week updates the boss.
create or replace function public.weekly_boss_on_completion()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid;
begin
  select user_id into v_uid from public.habits where id = coalesce(new.habit_id, old.habit_id);
  if v_uid is not null then
    perform public.refresh_weekly_boss(v_uid);
  end if;
  return null;
end;
$$;

revoke all on function public.weekly_boss_on_completion() from public, anon, authenticated;

drop trigger if exists weekly_boss_on_completion on public.completions;
create trigger weekly_boss_on_completion
  after insert or delete on public.completions
  for each row execute function public.weekly_boss_on_completion();

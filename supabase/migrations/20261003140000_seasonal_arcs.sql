-- Seasonal arcs (G6, Battiste 2026-10-03; ADR 024). Four arcs a year that
-- follow the social-media trends: Winter Arc (October-December), Spring Arc
-- (January-March), Summer Arc (April-June), Autumn Arc (July-September).
-- An arc is made of the weeks whose Thursday falls in it (13 or 14). A "good
-- week" is one where the player did at least 70 % of the validations their
-- quests plan (a frozen day counts as done). 8 good weeks earn the arc's
-- rune (+100 XP, +50 gold). The 4 different runes, collected over any
-- number of years, earn the four-seasons reward: a week of Premium for a
-- free player, 500 gold for a Premium one (the special cosmetic comes with
-- its sprite, G6b). Mirrors ARC in src/lib/constants/game-config.ts.

-- Week results, kept once the week is over (a later change of quests does
-- not rewrite the past).
create table if not exists public.arc_weeks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  done integer not null default 0 check (done >= 0),
  planned integer not null default 0 check (planned >= 0),
  primary key (user_id, week_start)
);

create table if not exists public.user_runes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  season text not null check (season in ('winter', 'spring', 'summer', 'autumn')),
  arc_year integer not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, season, arc_year)
);

alter table public.profiles add column if not exists four_seasons_rewarded_at timestamptz;

alter table public.arc_weeks enable row level security;
alter table public.user_runes enable row level security;
drop policy if exists "players read their own arc weeks" on public.arc_weeks;
create policy "players read their own arc weeks" on public.arc_weeks
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "players read their own runes" on public.user_runes;
create policy "players read their own runes" on public.user_runes
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.arc_weeks, public.user_runes from anon, authenticated;
grant select on public.arc_weeks, public.user_runes to authenticated;

-- The arc of a day: its season, the year it belongs to, first and last day.
create or replace function public.arc_of(p_day date)
returns table (season text, arc_year integer, starts_on date, ends_on date)
language sql
immutable
set search_path = ''
as $$
  select case
           when extract(month from p_day) >= 10 then 'winter'
           when extract(month from p_day) <= 3 then 'spring'
           when extract(month from p_day) <= 6 then 'summer'
           else 'autumn'
         end,
         extract(year from p_day)::integer,
         date_trunc('quarter', p_day)::date,
         (date_trunc('quarter', p_day) + interval '3 months - 1 day')::date;
$$;

-- Validations done in a week (a frozen day counts as a day of daily quests done).
create or replace function public.arc_week_done(p_user_id uuid, p_week date)
returns integer
language sql
stable
security definer set search_path = ''
as $$
  select (
    select count(*)::integer
    from public.completions c
    join public.habits h on h.id = c.habit_id
    where h.user_id = p_user_id
      and public.user_local_date(p_user_id, c.completed_at) between p_week and p_week + 6
  ) + (
    select count(*)::integer * (select count(*)::integer from public.habits h
                                where h.user_id = p_user_id and not h.is_archived and not h.is_paused
                                  and h.frequency = 'daily')
    from public.streak_freezes f
    where f.user_id = p_user_id and f.freeze_date between p_week and p_week + 6
  );
$$;

-- The arc state of a player on a given day (the app calls get_arc_state;
-- the day is a parameter so the rules can be tested at any date).
create or replace function public.arc_state_for(p_user_id uuid, p_today date)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := p_user_id;
  v_today date := p_today;
  v_arc record;
  v_week date;
  v_current date;
  v_planned integer;
  v_good integer := 0;
  v_weeks jsonb := '[]'::jsonb;
  v_row public.arc_weeks;
  v_total integer := 0;
  v_rune_new boolean := false;
  v_reward_new text := null;
  v_seasons integer;
  v_premium boolean;
begin
  -- The arc of the current week (its Thursday), so a week never straddles two arcs.
  select * into v_arc from public.arc_of(date_trunc('week', v_today)::date + 3);
  v_current := date_trunc('week', v_today)::date;
  v_planned := public.weekly_planned_validations(v_me);

  -- Weeks whose Thursday falls in the arc (ISO rule: every week belongs to
  -- exactly one arc, and the week where the arc starts counts).
  v_week := date_trunc('week', v_arc.starts_on)::date;
  if v_week + 3 < v_arc.starts_on then
    v_week := v_week + 7;
  end if;
  while v_week + 3 <= v_arc.ends_on loop
    v_total := v_total + 1;
    if v_week <= v_current then
      if v_week = v_current then
        -- The current week follows the quests as they are now.
        insert into public.arc_weeks (user_id, week_start, done, planned)
        values (v_me, v_week, public.arc_week_done(v_me, v_week), v_planned)
        on conflict (user_id, week_start) do update set done = excluded.done, planned = excluded.planned;
      else
        -- A past week is computed once (first time it is seen), then kept.
        insert into public.arc_weeks (user_id, week_start, done, planned)
        values (v_me, v_week, public.arc_week_done(v_me, v_week), v_planned)
        on conflict (user_id, week_start) do nothing;
      end if;
      select * into v_row from public.arc_weeks where user_id = v_me and week_start = v_week;
      if v_row.planned > 0 and v_row.done * 10 >= v_row.planned * 7 then
        v_good := v_good + 1;
      end if;
      v_weeks := v_weeks || jsonb_build_object(
        'week_start', v_week, 'done', v_row.done, 'planned', v_row.planned,
        'good', v_row.planned > 0 and v_row.done * 10 >= v_row.planned * 7,
        'current', v_week = v_current);
    else
      v_weeks := v_weeks || jsonb_build_object('week_start', v_week, 'future', true);
    end if;
    v_week := v_week + 7;
  end loop;

  -- The arc's rune, once.
  if v_good >= 8 then
    insert into public.user_runes (user_id, season, arc_year) values (v_me, v_arc.season, v_arc.arc_year)
    on conflict do nothing;
    if found then
      v_rune_new := true;
      perform public.award(v_me, 100, 50);
    end if;
  end if;

  -- The four seasons, once.
  select count(distinct season) into v_seasons from public.user_runes where user_id = v_me;
  if v_seasons = 4 and (select four_seasons_rewarded_at is null from public.profiles where id = v_me) then
    v_premium := private.is_premium(v_me);
    if v_premium then
      perform public.award(v_me, 0, 500);
      v_reward_new := 'gold';
    else
      update public.profiles
      set subscription_status = 'premium', subscription_expires_at = now() + interval '7 days'
      where id = v_me;
      v_reward_new := 'premium_week';
    end if;
    update public.profiles set four_seasons_rewarded_at = now() where id = v_me;
  end if;

  return json_build_object(
    'season', v_arc.season,
    'arc_year', v_arc.arc_year,
    'starts_on', v_arc.starts_on,
    'ends_on', v_arc.ends_on,
    'weeks', v_weeks,
    'total_weeks', v_total,
    'good_weeks', v_good,
    'target', 8,
    'rune_earned', exists (select 1 from public.user_runes
                           where user_id = v_me and season = v_arc.season and arc_year = v_arc.arc_year),
    'rune_new', v_rune_new,
    'runes', coalesce((select jsonb_agg(jsonb_build_object('season', season, 'arc_year', arc_year) order by earned_at)
                       from public.user_runes where user_id = v_me), '[]'::jsonb),
    'four_seasons_reward', v_reward_new,
    'four_seasons_done', (select four_seasons_rewarded_at is not null from public.profiles where id = v_me));
end;
$$;

create or replace function public.get_arc_state()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  return public.arc_state_for(v_me, public.user_today(v_me));
end;
$$;

revoke all on function public.arc_state_for(uuid, date) from public, anon, authenticated;
revoke all on function public.get_arc_state() from public, anon;
grant execute on function public.get_arc_state() to authenticated;
revoke all on function public.arc_week_done(uuid, date) from public, anon, authenticated;
revoke all on function public.arc_of(date) from public, anon;
grant execute on function public.arc_of(date) to authenticated;

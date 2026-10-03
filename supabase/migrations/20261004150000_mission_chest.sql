-- Mission chest (G7, ADR 028): once the day's three missions are claimed, a
-- chest gives a small random reward, drawn by the server. Never sold, never
-- tied to payment. If a mission reopens (quest unchecked, its reward taken
-- back), the chest is taken back too.

create table if not exists public.daily_chests (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  gold integer not null default 0,
  opened_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.daily_chests enable row level security;

drop policy if exists "Players see their own chests" on public.daily_chests;
create policy "Players see their own chests" on public.daily_chests
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.daily_chests from anon, authenticated;
grant select on public.daily_chests to authenticated;

-- Draw (mirrors CHEST in game-config.ts):
--   60 %: 20 to 40 gold; 35 %: 25 to 50 XP; 5 %: jackpot of 100 gold.
create or replace function public.open_daily_chest()
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_total integer;
  v_claimed integer;
  v_roll double precision := random();
  v_xp integer := 0;
  v_gold integer := 0;
  v_levels record;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_today := public.user_today(v_uid);
  select count(*), count(*) filter (where is_claimed)
  into v_total, v_claimed
  from public.user_daily_quests
  where user_id = v_uid and assigned_date = v_today;

  if v_total = 0 or v_claimed < v_total then
    return json_build_object('success', false, 'reason', 'not_ready');
  end if;

  if v_roll < 0.60 then
    v_gold := 20 + floor(random() * 21)::integer;
  elsif v_roll < 0.95 then
    v_xp := 25 + floor(random() * 26)::integer;
  else
    v_gold := 100;
  end if;

  insert into public.daily_chests (user_id, day, xp, gold) values (v_uid, v_today, v_xp, v_gold)
  on conflict do nothing;
  if not found then
    return json_build_object('success', false, 'reason', 'already_opened');
  end if;

  select * into v_levels from public.award(v_uid, v_xp, v_gold);
  return json_build_object(
    'success', true,
    'xp', v_xp,
    'gold', v_gold,
    'jackpot', v_gold = 100,
    'old_level', v_levels.old_level,
    'new_level', v_levels.new_level
  );
end;
$$;

revoke all on function public.open_daily_chest() from public, anon;
grant execute on function public.open_daily_chest() to authenticated;

-- A mission that reopens takes the day's chest back with it.
create or replace function public.take_back_daily_chest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chest public.daily_chests;
begin
  delete from public.daily_chests
  where user_id = old.user_id and day = old.assigned_date
  returning * into v_chest;
  if found and (v_chest.xp <> 0 or v_chest.gold <> 0) then
    perform public.award(old.user_id, -v_chest.xp, -v_chest.gold);
  end if;
  return new;
end;
$$;

revoke all on function public.take_back_daily_chest() from public, anon, authenticated;

drop trigger if exists on_mission_unclaimed_take_back_chest on public.user_daily_quests;
create trigger on_mission_unclaimed_take_back_chest
  after update of is_claimed on public.user_daily_quests
  for each row
  when (old.is_claimed and not new.is_claimed)
  execute function public.take_back_daily_chest();

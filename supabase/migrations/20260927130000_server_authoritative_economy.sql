-- Server-authoritative economy. XP, gold, levels, streaks, daily quests and
-- challenge progress are computed by the database; clients can no longer write
-- them. See docs/adr/008-server-authoritative-economy.md.
--
-- Depends on 20260927120000_rpc_caller_checks.sql (assert_caller_is,
-- challenges.wager_settled).

-- =============================================================================
-- 1. Profile: private e-mail removed, timezone added
-- =============================================================================

-- profiles is readable by every player; the address already lives in auth.users.
alter table public.profiles drop column if exists email;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

-- "Today" is the player's local day: streaks and daily limits follow it.
alter table public.profiles
  add column if not exists timezone text not null default 'UTC';

create or replace function public.set_timezone(p_timezone text)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Unknown timezone: %', p_timezone;
  end if;
  update public.profiles set timezone = p_timezone where id = auth.uid();
end;
$$;

-- =============================================================================
-- 2. Internal helpers (not callable by clients)
-- =============================================================================

create or replace function public.user_today(p_user_id uuid)
returns date
language sql
stable
security definer set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user_id), 'UTC'))::date;
$$;

create or replace function public.user_local_date(p_user_id uuid, p_at timestamptz)
returns date
language sql
stable
security definer set search_path = ''
as $$
  select (p_at at time zone coalesce(
    (select timezone from public.profiles where id = p_user_id), 'UTC'))::date;
$$;

-- Mirrors LEVEL_THRESHOLDS / getLevelForXp in src/lib/constants/game-config.ts
create or replace function public.level_for_xp(p_xp integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(max(i) - 1, 0)
  from unnest(array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000])
       with ordinality as t(threshold, i)
  where p_xp >= threshold;
$$;

-- Mirrors RANKS / getRankForLevel
create or replace function public.rank_for_level(p_level integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_level >= 11 then 'Legend'
    when p_level >= 9  then 'Champion'
    when p_level >= 7  then 'Knight'
    when p_level >= 5  then 'Warrior'
    when p_level >= 3  then 'Apprentice'
    else 'Novice'
  end;
$$;

-- The single place where XP and gold change. Floors both at 0.
create or replace function public.award(p_user_id uuid, p_xp integer, p_gold integer)
returns table (old_level integer, new_level integer)
language plpgsql
security definer set search_path = ''
as $$
declare
  v_old_level integer;
  v_xp integer;
begin
  select level into v_old_level from public.profiles where id = p_user_id for update;

  update public.profiles
  set xp = greatest(0, xp + coalesce(p_xp, 0)),
      gold = greatest(0, gold + coalesce(p_gold, 0))
  where id = p_user_id
  returning xp into v_xp;

  update public.profiles
  set level = public.level_for_xp(v_xp),
      rank = public.rank_for_level(public.level_for_xp(v_xp))
  where id = p_user_id;

  return query select v_old_level, public.level_for_xp(v_xp);
end;
$$;

-- Streak freezes: one free per week, plus tokens earned with rewarded ads.
create table if not exists public.streak_freezes (
  user_id uuid not null references public.profiles(id) on delete cascade,
  freeze_date date not null,
  source text not null check (source in ('weekly', 'token')),
  created_at timestamptz not null default now(),
  primary key (user_id, freeze_date)
);

alter table public.streak_freezes enable row level security;

create policy "Users can view own streak freezes"
  on public.streak_freezes for select
  using (auth.uid() = user_id);

-- A streak survives a gap only if every missed day was frozen.
create or replace function public.streak_continues(p_user_id uuid, p_last date, p_today date)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select p_last is not null
     and p_last < p_today
     and not exists (
       select 1
       from generate_series(p_last + 1, p_today - 1, interval '1 day') as d(day)
       where not exists (
         select 1 from public.streak_freezes f
         where f.user_id = p_user_id and f.freeze_date = d.day::date
       )
     );
$$;

-- Mirrors getWeeklyTarget in habits-store.ts
create or replace function public.weekly_target(p_frequency text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_frequency
    when '2x_week' then 2
    when '3x_week' then 3
    when '4x_week' then 4
    when '5x_week' then 5
    else 1
  end;
$$;

revoke all on function public.user_today(uuid) from public, anon, authenticated;
revoke all on function public.user_local_date(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.award(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.streak_continues(uuid, date, date) from public, anon, authenticated;

-- =============================================================================
-- 3. Completing a habit
-- =============================================================================

create or replace function public.complete_habit(p_habit_id uuid, p_note text default null)
returns json
language plpgsql
security definer set search_path = ''
as $$
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
$$;

-- =============================================================================
-- 4. Streak breaks and freezes
-- =============================================================================

-- Mirrors calculatePunishment in src/features/habits/utils/punishment.ts
create or replace function public.process_streak_breaks()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_row record;
  v_xp_loss integer := 0;
  v_gold_loss integer := 0;
  v_broken jsonb := '[]'::jsonb;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  v_today := public.user_today(v_uid);

  for v_row in
    select s.habit_id, s.current_count, s.last_completed_at
    from public.streaks s
    join public.habits h on h.id = s.habit_id
    where h.user_id = v_uid
      and not h.is_archived
      and not h.is_paused
      and s.current_count > 0
      and s.last_completed_at is not null
    for update of s
  loop
    -- Completed today or yesterday (or the gap is frozen): the streak is alive.
    if public.user_local_date(v_uid, v_row.last_completed_at) >= v_today - 1
       or public.streak_continues(v_uid, public.user_local_date(v_uid, v_row.last_completed_at), v_today) then
      continue;
    end if;

    update public.streaks set current_count = 0 where habit_id = v_row.habit_id;
    v_xp_loss := v_xp_loss + least(v_row.current_count * 2, 100);
    v_gold_loss := v_gold_loss + least(v_row.current_count, 50);
    v_broken := v_broken || jsonb_build_object('habit_id', v_row.habit_id, 'was_count', v_row.current_count);
  end loop;

  if v_xp_loss > 0 or v_gold_loss > 0 then
    perform public.award(v_uid, -v_xp_loss, -v_gold_loss);
  end if;

  return json_build_object('broken', v_broken, 'xp_loss', v_xp_loss, 'gold_loss', v_gold_loss);
end;
$$;

create or replace function public.activate_streak_freeze()
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
  v_weekly_used integer;
  v_tokens integer;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  v_today := public.user_today(v_uid);

  if exists (select 1 from public.streak_freezes where user_id = v_uid and freeze_date = v_today) then
    return json_build_object('success', true, 'already_active', true);
  end if;

  select count(*) into v_weekly_used from public.streak_freezes
  where user_id = v_uid and source = 'weekly'
    and freeze_date >= date_trunc('week', v_today)::date;

  if v_weekly_used < 1 then
    insert into public.streak_freezes (user_id, freeze_date, source) values (v_uid, v_today, 'weekly');
    return json_build_object('success', true, 'source', 'weekly');
  end if;

  select freeze_tokens into v_tokens from public.profiles where id = v_uid for update;
  if coalesce(v_tokens, 0) > 0 then
    update public.profiles set freeze_tokens = freeze_tokens - 1 where id = v_uid;
    insert into public.streak_freezes (user_id, freeze_date, source) values (v_uid, v_today, 'token');
    return json_build_object('success', true, 'source', 'token', 'tokens_left', v_tokens - 1);
  end if;

  return json_build_object('success', false, 'reason', 'no_freeze_left');
end;
$$;

-- =============================================================================
-- 5. Other rewards
-- =============================================================================

-- Achievements: the reward comes from the catalogue, once per achievement.
create or replace function public.reward_achievement()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_xp integer;
  v_gold integer;
begin
  select xp_reward, gold_reward into v_xp, v_gold
  from public.achievements where id = new.achievement_id;
  if coalesce(v_xp, 0) > 0 or coalesce(v_gold, 0) > 0 then
    perform public.award(new.user_id, v_xp, v_gold);
  end if;
  return new;
end;
$$;

drop trigger if exists on_achievement_unlocked_reward on public.user_achievements;
create trigger on_achievement_unlocked_reward
  after insert on public.user_achievements
  for each row execute function public.reward_achievement();

-- Duels: 30 gold for the winner, 25 XP for the loser, each claimed once.
alter table public.duels
  add column if not exists winner_rewarded boolean not null default false,
  add column if not exists loser_rewarded boolean not null default false;

create or replace function public.claim_duel_reward(p_duel_id uuid)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_duel public.duels;
begin
  select * into v_duel from public.duels where id = p_duel_id for update;
  if not found or v_uid is null or v_uid not in (v_duel.challenger_id, v_duel.opponent_id) then
    raise exception 'Duel not found' using errcode = 'P0002';
  end if;
  if v_duel.status <> 'resolved' or v_duel.winner_id is null then
    return json_build_object('success', false, 'reason', 'not_resolved');
  end if;

  if v_uid = v_duel.winner_id then
    if v_duel.winner_rewarded then
      return json_build_object('success', false, 'reason', 'already_claimed');
    end if;
    update public.duels set winner_rewarded = true where id = p_duel_id;
    perform public.award(v_uid, 0, 30);
    return json_build_object('success', true, 'gold', 30, 'xp', 0);
  end if;

  if v_duel.loser_rewarded then
    return json_build_object('success', false, 'reason', 'already_claimed');
  end if;
  update public.duels set loser_rewarded = true where id = p_duel_id;
  perform public.award(v_uid, 25, 0);
  return json_build_object('success', true, 'gold', 0, 'xp', 25);
end;
$$;

-- Daily quests: assigned per local day, claimed through the server only.
create or replace function public.assign_daily_quests(p_user_id uuid)
returns setof public.user_daily_quests
language plpgsql
security definer set search_path = ''
as $$
declare
  v_today date;
  v_difficulty text;
begin
  perform public.assert_caller_is(p_user_id);
  v_today := public.user_today(p_user_id);

  if not exists (
    select 1 from public.user_daily_quests where user_id = p_user_id and assigned_date = v_today
  ) then
    foreach v_difficulty in array array['easy', 'normal', 'hard'] loop
      insert into public.user_daily_quests (user_id, template_id, assigned_date)
      select p_user_id, id, v_today
      from public.daily_quest_templates
      where is_active and difficulty = v_difficulty
      order by random()
      limit 1
      on conflict do nothing;
    end loop;
  end if;

  return query
    select * from public.user_daily_quests
    where user_id = p_user_id and assigned_date = v_today;
end;
$$;

create or replace function public.claim_daily_quest(p_user_id uuid, p_quest_id uuid)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_quest public.user_daily_quests;
  v_template public.daily_quest_templates;
begin
  perform public.assert_caller_is(p_user_id);

  select * into v_quest from public.user_daily_quests
  where id = p_quest_id and user_id = p_user_id
  for update;

  if not found then
    return json_build_object('success', false, 'error', 'Quest not found');
  end if;
  if not v_quest.is_completed then
    return json_build_object('success', false, 'error', 'Quest not yet completed');
  end if;
  if v_quest.is_claimed then
    return json_build_object('success', false, 'error', 'Quest already claimed');
  end if;

  select * into v_template from public.daily_quest_templates where id = v_quest.template_id;

  update public.user_daily_quests set is_claimed = true, claimed_at = now() where id = p_quest_id;
  perform public.award(p_user_id, v_template.xp_reward, v_template.gold_reward);

  return json_build_object(
    'success', true,
    'xp_awarded', v_template.xp_reward,
    'gold_awarded', v_template.gold_reward
  );
end;
$$;

-- =============================================================================
-- 6. Guard rails on tables clients still write
-- =============================================================================

-- Streak rows are created with the habit, server-side.
create or replace function public.create_streak_for_habit()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.streaks (habit_id) values (new.id) on conflict (habit_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_habit_created_streak on public.habits;
create trigger on_habit_created_streak
  after insert on public.habits
  for each row execute function public.create_streak_for_habit();

-- Challenges: clients create them and accept/decline; progress, winner and
-- wager settlement belong to complete_habit.
create or replace function public.guard_challenge_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.gold_wager < 0 or new.gold_wager > 100 or new.target <= 0 then
      raise exception 'Invalid challenge' using errcode = '22023';
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
    or (old.status in ('pending', 'active') and new.status = 'cancelled')
  ) then
    raise exception 'Invalid challenge status change' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_challenge_writes on public.challenges;
create trigger guard_challenge_writes
  before insert or update on public.challenges
  for each row execute function public.guard_challenge_writes();

-- Duels: same limits as feature-gates.ts (free: 3 per week and 48 h between
-- duels; premium: 24 h between duels). Results can only be set once and the
-- winner must be one of the two players.
create or replace function public.guard_duel_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_premium boolean;
  v_last timestamptz;
begin
  -- Only client writes are limited; server code (definer functions) is trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select subscription_status = 'premium'
           and (subscription_expires_at is null or subscription_expires_at > now())
    into v_premium
    from public.profiles where id = new.challenger_id;

    select max(d.created_at) into v_last
    from public.duels d
    where (d.challenger_id = new.challenger_id or d.opponent_id = new.challenger_id)
      and d.status <> 'cancelled';
    if v_last is not null
       and v_last > now() - (case when v_premium then interval '24 hours' else interval '48 hours' end) then
      raise exception 'Duel cooldown not over' using errcode = '42501';
    end if;

    if not coalesce(v_premium, false) and (
        select count(*) from public.duels d
        where (d.challenger_id = new.challenger_id or d.opponent_id = new.challenger_id)
          and d.status <> 'cancelled'
          and d.created_at >= date_trunc('week', now())) >= 3 then
      raise exception 'Weekly duel limit reached' using errcode = '42501';
    end if;
    new.winner_id := null;
    new.winner_rewarded := false;
    new.loser_rewarded := false;
    return new;
  end if;

  if new.winner_rewarded is distinct from old.winner_rewarded
     or new.loser_rewarded is distinct from old.loser_rewarded
     or new.challenger_id is distinct from old.challenger_id
     or new.opponent_id is distinct from old.opponent_id then
    raise exception 'Protected duel fields' using errcode = '42501';
  end if;
  if old.status = 'resolved' and (new.status, new.winner_id) is distinct from (old.status, old.winner_id) then
    raise exception 'Duel already resolved' using errcode = '42501';
  end if;
  if new.winner_id is not null and new.winner_id not in (new.challenger_id, new.opponent_id) then
    raise exception 'Winner must be a player of the duel' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_duel_writes on public.duels;
create trigger guard_duel_writes
  before insert or update on public.duels
  for each row execute function public.guard_duel_writes();

-- =============================================================================
-- 7. Privileges: economy columns and tables are server-only
-- =============================================================================

revoke insert, update on public.profiles from anon, authenticated;
grant update (username, skin_color, hair_color, eye_color, active_theme)
  on public.profiles to authenticated;

revoke insert, update, delete on public.completions from anon, authenticated;
revoke insert, update, delete on public.streaks from anon, authenticated;
revoke insert, update, delete on public.user_daily_quests from anon, authenticated;
revoke update, delete on public.user_achievements from anon, authenticated;
revoke insert, update, delete on public.streak_freezes from anon, authenticated;

-- Raw XP/gold/punishment RPCs are for server code only.
revoke execute on function public.increment_xp(uuid, integer) from authenticated;
revoke execute on function public.add_gold(uuid, integer) from authenticated;
revoke execute on function public.apply_punishment(uuid, integer, integer) from authenticated;

revoke all on function public.complete_habit(uuid, text) from public, anon;
revoke all on function public.process_streak_breaks() from public, anon;
revoke all on function public.activate_streak_freeze() from public, anon;
revoke all on function public.claim_duel_reward(uuid) from public, anon;
revoke all on function public.assign_daily_quests(uuid) from public, anon;
revoke all on function public.claim_daily_quest(uuid, uuid) from public, anon;
revoke all on function public.set_timezone(text) from public, anon;

grant execute on function public.complete_habit(uuid, text) to authenticated;
grant execute on function public.process_streak_breaks() to authenticated;
grant execute on function public.activate_streak_freeze() to authenticated;
grant execute on function public.claim_duel_reward(uuid) to authenticated;
grant execute on function public.assign_daily_quests(uuid) to authenticated;
grant execute on function public.claim_daily_quest(uuid, uuid) to authenticated;
grant execute on function public.set_timezone(text) to authenticated;

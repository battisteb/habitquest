-- Pausing a quest really protects its streak (fix found while merging the
-- ways to pause, D3).
--
-- Before: process_streak_breaks skipped paused quests, but on resume the next
-- validation counted every paused day as missed and the streak started over.
-- And paused_at was written by the app, so it could be backdated.
--
-- Now paused_at is set by the server, and on resume the streak's last
-- validation moves forward by the length of the pause (at most to yesterday,
-- so validating today still counts): days missed before the pause stay
-- missed, paused days do not count.

create or replace function public.guard_habit_pause()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_paused and not old.is_paused then
    new.paused_at := now();
  elsif not new.is_paused and old.is_paused then
    if old.paused_at is not null then
      update public.streaks s
      set last_completed_at = least(s.last_completed_at + (now() - old.paused_at), now() - interval '1 day')
      where s.habit_id = new.id
        and s.last_completed_at is not null
        and s.last_completed_at < old.paused_at;
    end if;
    new.paused_at := null;
  else
    -- No other change to the pause date from the app.
    new.paused_at := old.paused_at;
  end if;
  return new;
end;
$$;

revoke all on function public.guard_habit_pause() from public, anon, authenticated;

drop trigger if exists on_habit_pause_guard on public.habits;
create trigger on_habit_pause_guard
  before update on public.habits
  for each row execute function public.guard_habit_pause();

-- A quest created paused starts its pause now.
create or replace function public.guard_habit_pause_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.paused_at := case when new.is_paused then now() else null end;
  return new;
end;
$$;

revoke all on function public.guard_habit_pause_insert() from public, anon, authenticated;

drop trigger if exists on_habit_pause_guard_insert on public.habits;
create trigger on_habit_pause_guard_insert
  before insert on public.habits
  for each row execute function public.guard_habit_pause_insert();

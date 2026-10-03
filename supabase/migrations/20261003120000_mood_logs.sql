-- Mood of the day (idea I4 of Battiste's competitor study, ADR 023): one tap
-- a day, 1 (bad) to 5 (great). Crossed with the quests done, it gives
-- personal insights in the stats ("on days you run, your mood is better").
-- Private: only the player reads their moods.

create table if not exists public.mood_logs (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  mood smallint not null check (mood between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.mood_logs enable row level security;

drop policy if exists "Users read their own moods" on public.mood_logs;
create policy "Users read their own moods" on public.mood_logs
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.mood_logs from anon, authenticated;
grant select on public.mood_logs to authenticated;

-- Writes go through log_mood: today's local day, for the caller only.
create or replace function public.log_mood(p_mood integer)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_today date;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_mood is null or p_mood < 1 or p_mood > 5 then
    raise exception 'Mood must be between 1 and 5' using errcode = '22023';
  end if;
  v_today := public.user_today(v_uid);
  insert into public.mood_logs (user_id, day, mood) values (v_uid, v_today, p_mood)
  on conflict (user_id, day) do update set mood = excluded.mood, updated_at = now();
  return json_build_object('success', true, 'day', v_today, 'mood', p_mood);
end;
$$;

revoke all on function public.log_mood(integer) from public, anon;
grant execute on function public.log_mood(integer) to authenticated;

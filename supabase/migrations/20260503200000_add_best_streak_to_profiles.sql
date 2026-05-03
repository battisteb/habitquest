-- Add best_streak to profiles for cross-user streak leaderboard without habits RLS bypass
alter table public.profiles
  add column if not exists best_streak integer not null default 0;

-- Backfill from streaks table for existing users
update public.profiles p
set best_streak = (
  select coalesce(max(s.longest_count), 0)
  from public.habits h
  join public.streaks s on s.habit_id = h.id
  where h.user_id = p.id
    and h.is_archived = false
);

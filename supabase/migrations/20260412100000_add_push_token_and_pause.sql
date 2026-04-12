-- Add push_token to profiles for Expo push notifications
alter table public.profiles
  add column if not exists push_token text default null;

-- Add pause support to habits (was in a local-only migration)
alter table public.habits
  add column if not exists is_paused boolean not null default false,
  add column if not exists paused_at timestamptz default null;

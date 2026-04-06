-- Add pause support to habits
alter table public.habits
  add column if not exists is_paused boolean not null default false,
  add column if not exists paused_at timestamptz default null;

-- Paused habits are excluded from punishment/streak checks
-- The streak-punishment Edge Function should also check this column

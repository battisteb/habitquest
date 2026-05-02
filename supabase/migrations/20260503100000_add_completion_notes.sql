-- Add optional note field to completions
alter table public.completions add column if not exists note text;

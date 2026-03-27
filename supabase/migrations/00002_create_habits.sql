-- Create habits table
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  category text not null default 'custom',
  frequency text not null default 'daily',
  is_archived boolean not null default false,
  created_at timestamptz not null default now()
);

-- Enable RLS
alter table public.habits enable row level security;

-- Users can only access their own habits
create policy "Users can read own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

-- Index for fast user lookups
create index habits_user_id_idx on public.habits(user_id);

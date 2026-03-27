-- Create completions table
create table public.completions (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  completed_at timestamptz not null default now(),
  xp_earned integer not null default 0
);

-- Enable RLS
alter table public.completions enable row level security;

-- Users can access completions for their own habits
create policy "Users can read own completions"
  on public.completions for select
  using (
    exists (
      select 1 from public.habits
      where habits.id = completions.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can insert own completions"
  on public.completions for insert
  with check (
    exists (
      select 1 from public.habits
      where habits.id = completions.habit_id
      and habits.user_id = auth.uid()
    )
  );

-- Indexes
create index completions_habit_id_idx on public.completions(habit_id);
create index completions_completed_at_idx on public.completions(completed_at);

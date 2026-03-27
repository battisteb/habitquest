-- Create streaks table
create table public.streaks (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade unique not null,
  current_count integer not null default 0,
  longest_count integer not null default 0,
  last_completed_at timestamptz
);

-- Enable RLS
alter table public.streaks enable row level security;

-- Users can access streaks for their own habits
create policy "Users can read own streaks"
  on public.streaks for select
  using (
    exists (
      select 1 from public.habits
      where habits.id = streaks.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can update own streaks"
  on public.streaks for update
  using (
    exists (
      select 1 from public.habits
      where habits.id = streaks.habit_id
      and habits.user_id = auth.uid()
    )
  );

create policy "Users can insert own streaks"
  on public.streaks for insert
  with check (
    exists (
      select 1 from public.habits
      where habits.id = streaks.habit_id
      and habits.user_id = auth.uid()
    )
  );

-- Index
create index streaks_habit_id_idx on public.streaks(habit_id);

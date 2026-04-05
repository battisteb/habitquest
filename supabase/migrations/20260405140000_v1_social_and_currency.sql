-- Migration: v1_social_and_currency
-- Adds gold currency, rank system, friendships, and challenges

-- =============================================================================
-- 1. Add gold and rank columns to profiles
-- =============================================================================

alter table public.profiles
  add column gold integer not null default 0;

alter table public.profiles
  add column rank text not null default 'Novice';

-- =============================================================================
-- 2. Friendships table
-- =============================================================================

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

-- Indexes for common lookups
create index idx_friendships_requester_id on public.friendships(requester_id);
create index idx_friendships_addressee_id on public.friendships(addressee_id);

-- Enable RLS
alter table public.friendships enable row level security;

-- Users can see friendships where they are requester or addressee
create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Users can insert friendships where they are the requester
create policy "Users can send friend requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

-- Addressee can update friendship status (accept / reject)
create policy "Addressee can update friendship status"
  on public.friendships for update
  using (auth.uid() = addressee_id);

-- Either party can delete a friendship
create policy "Either party can delete friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- =============================================================================
-- 3. Challenges table
-- =============================================================================

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  opponent_id uuid not null references public.profiles(id) on delete cascade,
  type text not null
    check (type in ('xp_race', 'completion_count')),
  target integer not null,
  creator_progress integer not null default 0,
  opponent_progress integer not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'completed', 'cancelled')),
  winner_id uuid references public.profiles(id),
  gold_wager integer not null default 10,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes for participant lookups
create index idx_challenges_creator_id on public.challenges(creator_id);
create index idx_challenges_opponent_id on public.challenges(opponent_id);

-- Enable RLS
alter table public.challenges enable row level security;

-- Participants can see their own challenges
create policy "Participants can view own challenges"
  on public.challenges for select
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

-- Creator can insert challenges
create policy "Creator can insert challenges"
  on public.challenges for insert
  with check (auth.uid() = creator_id);

-- Participants can update their challenges
create policy "Participants can update own challenges"
  on public.challenges for update
  using (auth.uid() = creator_id or auth.uid() = opponent_id);

-- =============================================================================
-- 4. Updated increment_xp function with gold and rank
-- =============================================================================

create or replace function public.increment_xp(user_id uuid, xp_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  new_xp integer;
  new_level integer;
  new_rank text;
  gold_earned integer;
  thresholds integer[] := array[0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600, 6000];
begin
  -- Increment XP
  update public.profiles
  set xp = xp + xp_amount
  where id = user_id
  returning xp into new_xp;

  -- Calculate level from thresholds
  new_level := 0;
  for i in 1..array_length(thresholds, 1) loop
    if new_xp >= thresholds[i] then
      new_level := i - 1;
    end if;
  end loop;

  -- Calculate gold earned: 1 gold per 10 XP, rounded down
  gold_earned := floor(xp_amount / 10);

  -- Determine rank based on level
  case
    when new_level <= 2  then new_rank := 'Novice';
    when new_level <= 4  then new_rank := 'Apprentice';
    when new_level <= 6  then new_rank := 'Warrior';
    when new_level <= 8  then new_rank := 'Knight';
    when new_level <= 10 then new_rank := 'Champion';
    else                      new_rank := 'Legend';
  end case;

  -- Update level, gold, and rank
  update public.profiles
  set level = new_level,
      gold  = gold + gold_earned,
      rank  = new_rank
  where id = user_id;
end;
$$;
